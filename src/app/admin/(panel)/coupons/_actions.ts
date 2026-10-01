"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/legacy/server";

export type CouponFormData = {
  code: string;
  title: string | null;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  max_usage: number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  image_url: string | null;
  applies_to: "all" | "product" | "category" | "brand";
  applies_to_ids: string[];
};

export async function createCoupon(data: CouponFormData): Promise<{ error?: string; id?: string }> {
  if (!data.code.trim()) return { error: "Kode kupon wajib diisi." };
  if (data.value <= 0) return { error: "Nilai diskon harus lebih dari 0." };
  if (data.type === "percentage" && data.value > 100) {
    return { error: "Persentase tidak boleh lebih dari 100%." };
  }
  if (
    data.valid_from &&
    data.valid_until &&
    new Date(data.valid_until) <= new Date(data.valid_from)
  ) {
    return { error: "Tanggal berakhir harus setelah tanggal mulai." };
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("coupons")
    .select("id")
    .eq("code", data.code.trim().toUpperCase())
    .maybeSingle();

  if (existing) return { error: "Kode kupon sudah digunakan." };

  const { data: coupon, error } = await supabase
    .from("coupons")
    .insert({
      code: data.code.trim().toUpperCase(),
      title: data.title || null,
      description: data.description || null,
      type: data.type,
      value: data.value,
      min_purchase: data.min_purchase,
      max_discount: data.max_discount,
      max_usage: data.max_usage,
      is_active: data.is_active,
      valid_from: data.valid_from || null,
      valid_until: data.valid_until || null,
      image_url: data.image_url || null,
      applies_to: data.applies_to,
      applies_to_ids: data.applies_to === "all" ? [] : data.applies_to_ids,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  return { id: coupon.id };
}

export async function updateCoupon(id: string, data: CouponFormData): Promise<{ error?: string }> {
  if (!data.code.trim()) return { error: "Kode kupon wajib diisi." };
  if (data.value <= 0) return { error: "Nilai diskon harus lebih dari 0." };
  if (data.type === "percentage" && data.value > 100) {
    return { error: "Persentase tidak boleh lebih dari 100%." };
  }
  if (
    data.valid_from &&
    data.valid_until &&
    new Date(data.valid_until) <= new Date(data.valid_from)
  ) {
    return { error: "Tanggal berakhir harus setelah tanggal mulai." };
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("coupons")
    .select("id")
    .eq("code", data.code.trim().toUpperCase())
    .neq("id", id)
    .maybeSingle();

  if (existing) return { error: "Kode kupon sudah digunakan oleh kupon lain." };

  const { error } = await supabase
    .from("coupons")
    .update({
      code: data.code.trim().toUpperCase(),
      title: data.title || null,
      description: data.description || null,
      type: data.type,
      value: data.value,
      min_purchase: data.min_purchase,
      max_discount: data.max_discount,
      max_usage: data.max_usage,
      is_active: data.is_active,
      valid_from: data.valid_from || null,
      valid_until: data.valid_until || null,
      image_url: data.image_url || null,
      applies_to: data.applies_to,
      applies_to_ids: data.applies_to === "all" ? [] : data.applies_to_ids,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${id}/edit`);
  return {};
}

export async function toggleCouponActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("coupons").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  return {};
}

export async function deleteCoupon(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/coupons");
  return {};
}
