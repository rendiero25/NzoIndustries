"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export type PromotionType = "second_products" | "featured_products";

export type PromotionConfig =
  | { sort_by?: "rating" | "price_asc" | "price_desc" | "newest" }
  | { sort_by?: "manual" | "newest" | "bestseller" | "rating"; category_id?: string };

export type PromotionFormData = {
  type: PromotionType;
  title: string;
  subtitle?: string;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  config: Record<string, unknown>;
  product_ids: string[];
  brand_ids: string[];
};

export type PromotionRow = {
  id: string;
  type: PromotionType;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  config: Record<string, unknown>;
  created_at: string;
  product_count: number;
  brand_count: number;
};

function revalidatePromotion(type: PromotionType, id?: string) {
  revalidatePath(`/admin/promotions/${type.replace("_", "-")}`);
  if (id) revalidatePath(`/admin/promotions/${type.replace("_", "-")}/${id}`);
  revalidatePath("/");
}

export async function createPromotion(
  data: PromotionFormData,
): Promise<{ error?: string; id?: string }> {
  if (!data.title.trim()) return { error: "Judul promosi wajib diisi." };
  if (data.max_items < 1) return { error: "Jumlah item harus minimal 1." };

  const supabase = await createServiceClient();

  const { data: promo, error } = await supabase
    .from("promotions")
    .insert({
      type: data.type,
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      is_active: data.is_active,
      max_items: data.max_items,
      selection_mode: data.selection_mode,
      config: data.config as unknown as Json,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const promoId = promo.id;

  if (data.selection_mode === "manual" && data.product_ids.length > 0) {
    const { error: ppErr } = await supabase.from("promotion_products").insert(
      data.product_ids.map((pid, i) => ({
        promotion_id: promoId,
        product_id: pid,
        display_order: i,
      })),
    );
    if (ppErr) return { error: ppErr.message };
  }

  if (data.selection_mode === "brand" && data.brand_ids.length > 0) {
    const { error: pbErr } = await supabase.from("promotion_brands").insert(
      data.brand_ids.map((bid) => ({
        promotion_id: promoId,
        brand_id: bid,
      })),
    );
    if (pbErr) return { error: pbErr.message };
  }

  revalidatePromotion(data.type, promoId);
  return { id: promoId };
}

export async function updatePromotion(
  id: string,
  data: PromotionFormData,
): Promise<{ error?: string }> {
  if (!data.title.trim()) return { error: "Judul promosi wajib diisi." };
  if (data.max_items < 1) return { error: "Jumlah item harus minimal 1." };

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("promotions")
    .update({
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      is_active: data.is_active,
      max_items: data.max_items,
      selection_mode: data.selection_mode,
      config: data.config as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Replace associations
  await supabase.from("promotion_products").delete().eq("promotion_id", id);
  await supabase.from("promotion_brands").delete().eq("promotion_id", id);

  if (data.selection_mode === "manual" && data.product_ids.length > 0) {
    await supabase.from("promotion_products").insert(
      data.product_ids.map((pid, i) => ({
        promotion_id: id,
        product_id: pid,
        display_order: i,
      })),
    );
  }

  if (data.selection_mode === "brand" && data.brand_ids.length > 0) {
    await supabase.from("promotion_brands").insert(
      data.brand_ids.map((bid) => ({
        promotion_id: id,
        brand_id: bid,
      })),
    );
  }

  revalidatePromotion(data.type, id);
  return {};
}

export async function togglePromotionActive(
  id: string,
  type: PromotionType,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("promotions").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePromotion(type);
  return {};
}

export async function deletePromotion(
  id: string,
  type: PromotionType,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePromotion(type);
  return {};
}

export async function createPromotionBannerInline(
  promotionType: PromotionType,
  formData: FormData,
): Promise<{ error?: string }> {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return {};

  const supabase = await createServiceClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `promotions/${promotionType}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("banners")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("banners").getPublicUrl(path);

  const { error } = await supabase.from("banners").insert({
    image_url: publicUrl,
    template: promotionType,
    is_active: true,
    sort_order: 1,
  });

  if (error) return { error: error.message };
  revalidatePromotion(promotionType);
  return {};
}
