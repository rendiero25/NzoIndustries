"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  setRoleSchema,
  storeSettingsSchema,
  type StoreSettingsValues,
} from "@/lib/validations/admin-system";

import { adminGuard, ROLES, rpcMessage } from "./_guard";

type Result = { ok: true } | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

const ROLE_ERRORS: Record<string, string> = {
  "cannot demote the last owner":
    "Owner terakhir tidak bisa diturunkan. Jadikan akun lain owner dulu.",
  "user not found": "Akun tidak ditemukan.",
};

/** Ubah role akun (RPC `set_user_role`, owner saja). */
export async function setStaffRole(input: { userId: string; role: string }): Promise<Result> {
  const guard = await adminGuard(ROLES.owner);
  if (!guard.ok) return guard;
  const parsed = setRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (parsed.data.userId === guard.user.id) {
    return { ok: false, error: "Role akun sendiri tidak bisa diubah dari sini." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    target_user: parsed.data.userId,
    new_role: parsed.data.role,
  });
  if (error) {
    return {
      ok: false,
      error: ROLE_ERRORS[error.message] ?? rpcMessage(error, "Role gagal diubah."),
    };
  }
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Cari akun terdaftar berdasarkan email persis (owner saja). */
export async function findUserByEmail(
  email: string,
): Promise<
  | { ok: true; user: { id: string; fullName: string | null; email: string; role: string } | null }
  | { ok: false; error: string }
> {
  const guard = await adminGuard(ROLES.owner);
  if (!guard.ok) return guard;
  const parsed = z.email("Email tidak valid.").max(254).safeParse(email.trim());
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_find_user", { p_email: parsed.data });
  if (error) return { ok: false, error: rpcMessage(error, "Pencarian gagal.") };
  const u = data?.[0];
  return {
    ok: true,
    user: u ? { id: u.id, fullName: u.full_name, email: u.email, role: u.role } : null,
  };
}

/** Simpan pengaturan toko (RLS `store_settings_update_owner`). */
export async function saveStoreSettings(input: StoreSettingsValues): Promise<Result> {
  const guard = await adminGuard(ROLES.owner);
  if (!guard.ok) return guard;
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  // Menyalakan MFA wajib dari sesi yang sudah terverifikasi MFA, supaya owner
  // tidak terkunci dari panel admin (RLS meminta aal2 begitu flag menyala).
  if (v.requireStaffMfa) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      return {
        ok: false,
        error:
          "Daftarkan authenticator di halaman MFA dan masuk dengan kode dulu, baru wajibkan MFA.",
      };
    }
  }

  const { data, error } = await supabase
    .from("store_settings")
    .update({
      store_name: v.storeName,
      support_email: v.supportEmail,
      support_whatsapp: v.supportWhatsapp,
      mayar_enabled: v.mayarEnabled,
      payment_timeout_minutes: v.paymentTimeoutMinutes,
      low_stock_threshold: v.lowStockThreshold,
      return_window_days: v.returnWindowDays,
      require_staff_mfa: v.requireStaffMfa,
      shipper: {
        name: v.shipper.name ?? null,
        phone: v.shipper.phone,
        address: v.shipper.address ?? null,
        postal_code: v.shipper.postalCode,
        area_id: v.shipper.areaId ?? null,
      },
    })
    .eq("id", true)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: rpcMessage(error, "Pengaturan gagal disimpan.") };
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Tandai semua notifikasi staf ini sudah dibaca. */
export async function markStaffNotificationsRead(): Promise<Result> {
  const guard = await adminGuard(ROLES.staff);
  if (!guard.ok) return guard;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", guard.user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: "Notifikasi gagal diperbarui." };
  revalidatePath("/admin/notifications");
  return { ok: true };
}
