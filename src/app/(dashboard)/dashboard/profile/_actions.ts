"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SimpleActionResult = { success: true } | { success: false; error: string };

const profileSchema = z.object({
  full_name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  avatar_url: z.string().trim().max(2000).optional(),
  bank_name: z.string().trim().max(100).optional(),
  bank_account_name: z.string().trim().max(200).optional(),
  bank_account_number: z.string().trim().max(50).optional(),
});

export async function updateProfileAction(
  values: z.infer<typeof profileSchema>,
): Promise<SimpleActionResult> {
  try {
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: "Data profil tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { full_name, phone, avatar_url, bank_name, bank_account_name, bank_account_number } =
      parsed.data;
    const trimmedAvatar = avatar_url?.trim() ?? "";
    if (trimmedAvatar.length > 0 && !z.string().url().safeParse(trimmedAvatar).success) {
      return { success: false, error: "URL foto tidak valid." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: full_name?.trim() || null,
        phone: phone?.trim() || null,
        avatar_url: trimmedAvatar.length > 0 ? trimmedAvatar : null,
        bank_name: bank_name?.trim() || null,
        bank_account_name: bank_account_name?.trim() || null,
        bank_account_number: bank_account_number?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

const passwordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export async function updatePasswordAction(
  values: z.infer<typeof passwordSchema>,
): Promise<SimpleActionResult> {
  try {
    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: "Password minimal 8 karakter." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
