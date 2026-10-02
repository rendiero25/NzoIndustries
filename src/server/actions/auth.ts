"use server";

import { z } from "zod";

import { isStaffRole, isAppRole } from "@/lib/auth/access";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { getClientEnv } from "@/lib/env.client";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const turnstileField = { turnstileToken: z.string().max(4096).optional() };

const GENERIC_ERROR = "Terjadi kesalahan. Coba lagi.";
const CAPTCHA_ERROR = "Verifikasi keamanan gagal. Coba lagi.";

function callbackUrl(next: string) {
  const { NEXT_PUBLIC_APP_URL } = getClientEnv();
  return `${NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(next)}`;
}

/**
 * Daftar akun pelanggan. Email verifikasi dikirim Supabase Auth.
 * Respons sama untuk email baru maupun yang sudah terdaftar (anti-enumerasi).
 */
export async function signUpAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.extend(turnstileField).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data pendaftaran tidak valid." };

  const { email, password, first_name, last_name, phone, turnstileToken } = parsed.data;
  if (!(await verifyTurnstile(turnstileToken))) return { ok: false, error: CAPTCHA_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: callbackUrl("/dashboard"),
      data: {
        full_name: `${first_name.trim()} ${last_name.trim()}`.trim(),
        phone: phone.replace(/[^\d+]/g, ""),
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("password"))
      return { ok: false, error: "Password belum memenuhi syarat keamanan." };
    if (msg.includes("rate limit") || error.status === 429) {
      return { ok: false, error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
    }
    // "User already registered" diperlakukan sukses supaya tidak membocorkan email terdaftar.
    if (!msg.includes("already")) return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}

/** Kirim ulang email aktivasi. Selalu "sukses" ke client (anti-enumerasi). */
export async function resendActivationAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: z.email() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Email tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email.trim().toLowerCase(),
    options: { emailRedirectTo: callbackUrl("/dashboard") },
  });
  if (error && (error.status === 429 || error.message.toLowerCase().includes("rate limit"))) {
    return { ok: false, error: "Tunggu sebentar sebelum mengirim ulang." };
  }
  return { ok: true };
}

/**
 * Login staf. Hanya role staf yang boleh lanjut. Tujuan berikutnya:
 * /admin/mfa bila MFA staf diwajibkan (D-20), selain itu langsung /admin.
 */
export async function adminSignInAction(
  input: unknown,
): Promise<{ ok: true; next: "/admin" | "/admin/mfa" } | { ok: false; error: string }> {
  const parsed = loginSchema.extend(turnstileField).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Email atau password tidak valid." };
  if (!(await verifyTurnstile(parsed.data.turnstileToken)))
    return { ok: false, error: CAPTCHA_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const msg = error?.message.toLowerCase() ?? "";
    if (msg.includes("email not confirmed")) {
      return { ok: false, error: "Email belum dikonfirmasi. Cek inbox Anda." };
    }
    if (error?.status === 429)
      return { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." };
    return { ok: false, error: "Email atau password salah." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = profile && isAppRole(profile.role) ? profile.role : null;
  if (!profile || profile.is_blocked || !isStaffRole(role)) {
    await supabase.auth.signOut();
    return { ok: false, error: "Akses ditolak. Akun ini bukan staf." };
  }

  const { data: mfaRequired, error: mfaError } = await supabase.rpc("staff_mfa_required");
  return { ok: true, next: mfaError || mfaRequired ? "/admin/mfa" : "/admin" };
}
