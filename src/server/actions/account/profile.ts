"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { getClientEnv } from "@/lib/env.client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from "@/lib/validations/account";

export type ActionResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi data profil.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Profil gagal disimpan." };
  revalidatePath("/account", "layout");
  return { ok: true };
}

/** Ganti kata sandi: kata sandi lama diverifikasi dulu lewat client terpisah tanpa sesi. */
export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.email) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("account", user.id))) {
    return { ok: false, error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  }
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi kata sandi.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const env = getClientEnv();
  const verifier = createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return {
      ok: false,
      error: "Kata sandi saat ini salah.",
      fieldErrors: { currentPassword: ["Kata sandi saat ini salah."] },
    };
  }
  await verifier.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    const aal = /aal2|AAL2/.test(error.message);
    return {
      ok: false,
      error: aal
        ? "Akun ini memakai autentikator. Masukkan kode autentikator dulu, lalu coba lagi."
        : "Kata sandi gagal diganti. Coba kata sandi lain.",
    };
  }
  return { ok: true };
}

/** Keluar dari semua perangkat (sesi lain ikut berakhir). */
export async function signOutEverywhere(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return { ok: false, error: "Gagal keluar dari semua perangkat." };
  return { ok: true };
}

/**
 * Hapus akun (D-35, UU PDP): data pribadi dianonimkan, pesanan disimpan untuk
 * pembukuan, email auth diganti alias acak, akun diblokir, semua sesi berakhir.
 */
export async function deleteAccount(input: { confirmEmail: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.email) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("account", user.id))) {
    return { ok: false, error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  }
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success || parsed.data.confirmEmail !== user.email.toLowerCase()) {
    return { ok: false, error: "Email konfirmasi tidak sama dengan email akunmu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("anonymize_my_account");
  if (error) {
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "Akun gagal dihapus. Coba lagi.",
    };
  }

  const { error: authError } = await createAdminClient().auth.admin.updateUserById(user.id, {
    email: `deleted-${crypto.randomUUID()}@deleted.invalid`,
    user_metadata: {},
    ban_duration: "876000h",
  });
  if (authError) console.error("[delete-account] auth update", authError.status);
  await supabase.auth.signOut({ scope: "global" });
  return { ok: true };
}
