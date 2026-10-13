"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  afterSalesStatusSchema,
  reviewModerationSchema,
  type AfterSalesStatusInput,
  type ReviewModerationInput,
} from "@/lib/validations/admin-service";
import { CATALOG_TAG } from "@/server/queries/reference";

import { adminGuard, ROLES, rpcMessage } from "./_guard";

type Result = { ok: true } | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

/** Blokir/buka blokir pelanggan (RPC `set_user_blocked`, owner/admin). */
export async function setCustomerBlocked(userId: string, blocked: boolean): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!z.uuid().safeParse(userId).success || typeof blocked !== "boolean") {
    return { ok: false, error: "Data tidak valid." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_blocked", { target_user: userId, blocked });
  if (error) {
    return {
      ok: false,
      error:
        error.message === "cannot block yourself"
          ? "Tidak bisa memblokir akun sendiri."
          : rpcMessage(error, "Status blokir gagal diubah."),
    };
  }
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true };
}

/** Moderasi ulasan: tayang/sembunyikan + balasan (RPC `admin_moderate_review`). */
export async function moderateReview(input: ReviewModerationInput): Promise<Result> {
  const guard = await adminGuard(ROLES.service);
  if (!guard.ok) return guard;
  const parsed = reviewModerationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_moderate_review", {
    p_id: v.id,
    p_status: v.status,
    p_reply: v.reply ?? undefined,
  });
  if (error) return { ok: false, error: rpcMessage(error, "Ulasan gagal disimpan.") };
  // Rating produk dihitung ulang trigger; halaman produk & beranda ikut diperbarui.
  revalidateTag(CATALOG_TAG, "max");
  revalidatePath("/admin/reviews");
  return { ok: true };
}

/** Ubah status retur/klaim garansi (matriks transisi + notifikasi di RPC). */
export async function setAfterSalesStatus(input: AfterSalesStatusInput): Promise<Result> {
  const guard = await adminGuard(ROLES.service);
  if (!guard.ok) return guard;
  const parsed = afterSalesStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_after_sales_status", {
    p_kind: v.kind,
    p_id: v.id,
    p_status: v.status,
    p_note: v.note ?? undefined,
    p_resolution: v.resolution ?? undefined,
  });
  if (error) return { ok: false, error: rpcMessage(error, "Status gagal diubah.") };
  revalidatePath("/admin/returns");
  revalidatePath(`/admin/returns/${v.kind}/${v.id}`);
  return { ok: true };
}
