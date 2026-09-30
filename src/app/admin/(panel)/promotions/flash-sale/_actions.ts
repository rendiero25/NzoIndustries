"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { flashSaleBannerTemplate } from "./_lib/flash-sale-banner-template";

export type FlashSaleFormData = {
  name: string;
  subtitle?: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export type FlashSaleProductFormData = {
  flash_sale_id: string;
  variant_id: string;
  sale_price: number;
  quota: number;
};

export async function createFlashSale(
  data: FlashSaleFormData,
): Promise<{ error?: string; id?: string }> {
  if (!data.name.trim()) return { error: "Nama flash sale wajib diisi." };
  if (!data.starts_at) return { error: "Waktu mulai wajib diisi." };
  if (!data.ends_at) return { error: "Waktu berakhir wajib diisi." };
  if (new Date(data.ends_at) <= new Date(data.starts_at)) {
    return { error: "Waktu berakhir harus setelah waktu mulai." };
  }

  const supabase = await createServiceClient();
  const { data: sale, error } = await supabase
    .from("flash_sales")
    .insert({
      name: data.name.trim(),
      subtitle: data.subtitle?.trim() || null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      is_active: data.is_active,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/flash-sale");
  revalidatePath("/");
  return { id: sale.id };
}

export async function updateFlashSale(
  id: string,
  data: FlashSaleFormData,
): Promise<{ error?: string }> {
  if (!data.name.trim()) return { error: "Nama flash sale wajib diisi." };
  if (new Date(data.ends_at) <= new Date(data.starts_at)) {
    return { error: "Waktu berakhir harus setelah waktu mulai." };
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("flash_sales")
    .update({
      name: data.name.trim(),
      subtitle: data.subtitle?.trim() || null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      is_active: data.is_active,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/flash-sale");
  revalidatePath(`/admin/promotions/flash-sale/${id}`);
  revalidatePath("/");
  return {};
}

export async function toggleFlashSaleActive(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("flash_sales").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/flash-sale");
  revalidatePath("/");
  return {};
}

export async function deleteFlashSale(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("flash_sales").delete().eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("banners").delete().eq("template", flashSaleBannerTemplate(id));
  revalidatePath("/admin/promotions/flash-sale");
  revalidatePath("/");
  return {};
}

export async function addFlashSaleProduct(
  data: FlashSaleProductFormData,
): Promise<{ error?: string }> {
  if (data.sale_price <= 0) return { error: "Harga flash sale harus lebih dari 0." };
  if (data.quota <= 0) return { error: "Kuota harus lebih dari 0." };

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("flash_sale_products")
    .select("id")
    .eq("flash_sale_id", data.flash_sale_id)
    .eq("variant_id", data.variant_id)
    .maybeSingle();

  if (existing) return { error: "Variant ini sudah ada di flash sale." };

  const { error } = await supabase.from("flash_sale_products").insert({
    flash_sale_id: data.flash_sale_id,
    variant_id: data.variant_id,
    sale_price: data.sale_price,
    quota: data.quota,
    sold: 0,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/promotions/flash-sale/${data.flash_sale_id}`);
  return {};
}

export async function updateFlashSaleProduct(
  id: string,
  salePrice: number,
  quota: number,
): Promise<{ error?: string }> {
  if (salePrice <= 0) return { error: "Harga flash sale harus lebih dari 0." };
  if (quota <= 0) return { error: "Kuota harus lebih dari 0." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("flash_sale_products")
    .update({ sale_price: salePrice, quota })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/flash-sale");
  return {};
}

export async function bulkAddFlashSaleProducts(
  flashSaleId: string,
  entries: { variant_id: string; sale_price: number }[],
): Promise<{ error?: string }> {
  if (entries.length === 0) return {};

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("flash_sale_products")
    .select("variant_id")
    .eq("flash_sale_id", flashSaleId);

  const existingIds = new Set((existing ?? []).map((r) => r.variant_id));
  const newEntries = entries.filter((e) => !existingIds.has(e.variant_id));
  if (newEntries.length === 0) return {};

  const { error } = await supabase.from("flash_sale_products").insert(
    newEntries.map((e) => ({
      flash_sale_id: flashSaleId,
      variant_id: e.variant_id,
      sale_price: e.sale_price > 0 ? e.sale_price : 1,
      quota: 1,
      sold: 0,
    })),
  );

  if (error) return { error: error.message };
  revalidatePath(`/admin/promotions/flash-sale/${flashSaleId}`);
  return {};
}

export async function createFlashSaleBannerInline(
  flashSaleId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return {};

  const supabase = await createServiceClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `flash-sale/${flashSaleId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("banners")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("banners").getPublicUrl(path);

  const template = flashSaleBannerTemplate(flashSaleId);
  const { error } = await supabase.from("banners").insert({
    image_url: publicUrl,
    template,
    is_active: true,
    sort_order: 1,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/promotions/flash-sale/${flashSaleId}`);
  return {};
}

export async function removeFlashSaleProduct(
  id: string,
  flashSaleId: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("flash_sale_products").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/promotions/flash-sale/${flashSaleId}`);
  return {};
}
