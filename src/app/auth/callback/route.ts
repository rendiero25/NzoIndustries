import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/redirect";
import type { Database } from "@/types/database";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

const INVALID_LINK = "Link tidak valid atau sudah kedaluwarsa. Silakan minta link baru.";

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Callback email Supabase Auth (verifikasi akun, reset password).
 * Mendukung PKCE `code` dan `token_hash`. Pesan error ke user selalu teks
 * tetap (tidak memantulkan isi query string).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const next = safeRedirectPath(searchParams.get("next"), "/dashboard");

  const fail = () => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", INVALID_LINK);
    return NextResponse.redirect(url);
  };

  if (searchParams.get("error")) return fail();

  const response = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient<Database>(
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

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? fail() : response;
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? fail() : response;
  }

  return fail();
}
