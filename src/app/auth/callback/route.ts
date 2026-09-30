import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

// 10 menit — cukup untuk OAuth flow selesai
const NEW_USER_WINDOW_MS = 10 * 60 * 1000;

function isNewOAuthUser(user: User): boolean {
  const provider = user.app_metadata?.provider as string | undefined;
  // Email/password: welcome email sudah dikirim saat register via /api/auth/register
  if (!provider || provider === "email") return false;
  // OAuth (Google, dll): cek apakah baru saja dibuat
  return Date.now() - new Date(user.created_at).getTime() < NEW_USER_WINDOW_MS;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  // Hanya izinkan path relatif untuk mencegah open-redirect
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const redirectUrl = new URL("/login", origin);
    // otp_expired = link aktivasi kedaluwarsa atau sudah pernah dipakai
    const friendlyMsg =
      error === "access_denied" && errorDescription?.toLowerCase().includes("expired")
        ? "Link aktivasi sudah kedaluwarsa. Silakan minta link baru."
        : (errorDescription ?? error);
    redirectUrl.searchParams.set("error", friendlyMsg);
    return NextResponse.redirect(redirectUrl);
  }

  // Helper: buat Supabase server client yang menulis cookies ke `response`.
  function makeSupabaseWithResponse(response: ReturnType<typeof NextResponse.redirect>) {
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
  }

  if (code) {
    // Buat response redirect dulu, lalu set cookies LANGSUNG ke response ini.
    // Jika cookies di-set ke cookieStore (next/headers) dan response dibuat
    // terpisah via NextResponse.redirect(), cookies tidak ikut terbawa ke browser.
    const redirectUrl = new URL(next, origin);
    const response = NextResponse.redirect(redirectUrl);
    const supabase = makeSupabaseWithResponse(response);

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const user = data.user;
      if (user?.email && isNewOAuthUser(user)) {
        const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email;
        sendWelcomeEmail({ to: user.email, name }).catch((err) => {
          console.error("[auth/callback] sendWelcomeEmail error:", err);
        });
      }
      return response;
    }
  }

  // Token-hash flow: link aktivasi email yang dibangun dari hashed_token.
  // Tidak melewati server Supabase (/auth/v1/verify) sehingga tidak ada
  // masalah implicit flow / hash fragment yang tidak terbaca server.
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type") as
    "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email" | null;

  if (tokenHash && typeParam) {
    const redirectUrl = new URL(next, origin);
    const response = NextResponse.redirect(redirectUrl);
    const supabase = makeSupabaseWithResponse(response);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam,
    });

    if (!verifyError) return response;

    const failUrl = new URL("/login", origin);
    failUrl.searchParams.set(
      "error",
      "Link aktivasi tidak valid atau sudah kedaluwarsa. Silakan minta link baru.",
    );
    return NextResponse.redirect(failUrl);
  }

  // Tidak ada code / token_hash — parameter tidak dikenali.
  const failUrl = new URL("/login", origin);
  failUrl.searchParams.set(
    "error",
    "Link aktivasi tidak valid atau sudah kedaluwarsa. Silakan minta link baru.",
  );
  return NextResponse.redirect(failUrl);
}
