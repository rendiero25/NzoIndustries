import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { loginSchema } from "@/lib/validations/auth";
import type { Database } from "@/types/supabase";

const bodySchema = loginSchema.extend({
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Email atau password tidak valid." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { captchaToken: parsed.data.turnstileToken },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      let errorMsg = authError.message;
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        errorMsg = "Email atau password salah.";
      } else if (msg.includes("email not confirmed")) {
        errorMsg = "Email belum dikonfirmasi. Cek inbox Anda.";
      } else if (msg.includes("captcha")) {
        errorMsg = "Verifikasi keamanan gagal. Coba lagi.";
      }
      return NextResponse.json({ success: false, error: errorMsg }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: "Gagal verifikasi akun." },
        { status: 500 },
      );
    }

    if (!profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Akun ini bukan admin." },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}
