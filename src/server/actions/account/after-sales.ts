"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  claimSchema,
  returnSchema,
  reviewSchema,
  type ClaimInput,
  type ReturnInput,
  type ReviewInput,
} from "@/lib/validations/account";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const ownPaths = (paths: string[], userId: string) =>
  paths.every((p) => p.startsWith(`${userId}/`));

/** Ulasan item pesanan selesai (RLS: milik sendiri & pesanan delivered/completed). */
export async function submitReview(input: ReviewInput): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi ulasanmu.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  if (!ownPaths(v.imagePaths, user.id)) return { ok: false, error: "Foto tidak valid." };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("id", v.orderItemId)
    .maybeSingle();
  if (!item?.product_id) return { ok: false, error: "Produk tidak ditemukan." };

  const { error } = await supabase.from("reviews").insert({
    product_id: item.product_id,
    user_id: user.id,
    order_item_id: v.orderItemId,
    rating: v.rating,
    comment: v.comment || null,
    image_paths: v.imagePaths,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Produk ini sudah kamu ulas."
          : "Ulasan hanya bisa untuk pesanan yang sudah diterima.",
    };
  }
  revalidatePath("/account", "layout");
  return { ok: true };
}

/** Ajukan retur dalam jendela retur (D-36, ditegakkan RLS). */
export async function requestReturn(input: ReturnInput): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi pengajuan retur.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  if (!ownPaths(v.mediaPaths, user.id)) return { ok: false, error: "File tidak valid." };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("order_number", v.orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };

  const { error } = await supabase.from("returns").insert({
    order_id: order.id,
    order_item_id: v.orderItemId,
    user_id: user.id,
    reason: v.reason,
    description: v.description || null,
    media_paths: v.mediaPaths,
  });
  if (error)
    return { ok: false, error: "Batas waktu retur sudah lewat atau pesanan belum diterima." };
  revalidatePath("/account", "layout");
  return { ok: true };
}

/** Klaim garansi item pesanan selesai. */
export async function submitWarrantyClaim(input: ClaimInput): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi klaim garansi.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  if (!ownPaths(v.mediaPaths, user.id)) return { ok: false, error: "File tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.from("warranty_claims").insert({
    order_item_id: v.orderItemId,
    user_id: user.id,
    description: v.description,
    media_paths: v.mediaPaths,
  });
  if (error) return { ok: false, error: "Klaim hanya bisa untuk pesanan yang sudah diterima." };
  revalidatePath("/account", "layout");
  return { ok: true };
}
