"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkRole } from "@/lib/auth/guards";
import { buildCloudinaryFolder } from "@/lib/cloudinary/folders";
import { destroyAsset, getAsset, getCloudinaryConfig } from "@/lib/cloudinary/server";
import { ALLOWED_IMAGE_FORMATS, MAX_IMAGE_BYTES } from "@/lib/cloudinary/signature";
import { createClient } from "@/lib/supabase/server";

export type ImageActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const ADMIN_ROLES = ["owner", "admin"] as const;

async function guard(): Promise<string | null> {
  const { decision } = await checkRole(ADMIN_ROLES);
  return decision.ok ? null : "Tidak diizinkan.";
}

const attachSchema = z.object({
  productId: z.uuid(),
  publicId: z.string().min(1).max(255),
  altText: z.string().trim().max(150).optional(),
});

/**
 * Sambungkan gambar yang baru di-upload ke produk. Aset diverifikasi ulang
 * lewat Admin API: harus ada, di folder SKU produk ini, format & ukuran
 * sesuai. Bila tidak lolos, aset dihapus dari Cloudinary.
 */
export async function attachProductImage(
  input: z.infer<typeof attachSchema>,
): Promise<ImageActionResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data gambar tidak valid." };
  const config = getCloudinaryConfig();
  if (!config) return { ok: false, error: "Cloudinary belum dikonfigurasi." };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, sku")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Produk tidak ditemukan." };

  const folder = buildCloudinaryFolder("products", product.sku);
  const { publicId } = parsed.data;
  if (!publicId.startsWith(`${folder}/`) || publicId.includes("..")) {
    return { ok: false, error: "Gambar tidak berada di folder produk ini." };
  }

  const asset = await getAsset(config, publicId).catch(() => null);
  if (!asset) return { ok: false, error: "Gambar tidak ditemukan di Cloudinary." };
  const formatOk = (ALLOWED_IMAGE_FORMATS as readonly string[]).includes(asset.format);
  if (!formatOk || asset.bytes > MAX_IMAGE_BYTES) {
    await destroyAsset(config, publicId).catch(() => false);
    return { ok: false, error: "Gambar harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB." };
  }

  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error } = await supabase
    .from("product_images")
    .insert({
      product_id: product.id,
      public_id: publicId,
      alt_text: parsed.data.altText || null,
      width: asset.width,
      height: asset.height,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: "Gagal menyimpan gambar." };

  revalidatePath("/admin/products");
  return { ok: true, data: { id: row.id } };
}

const deleteSchema = z.object({ imageId: z.uuid() });

export async function deleteProductImage(
  input: z.infer<typeof deleteSchema>,
): Promise<ImageActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };
  const config = getCloudinaryConfig();
  if (!config) return { ok: false, error: "Cloudinary belum dikonfigurasi." };

  const supabase = await createClient();
  const { data: image } = await supabase
    .from("product_images")
    .select("id, public_id")
    .eq("id", parsed.data.imageId)
    .maybeSingle();
  if (!image) return { ok: false, error: "Gambar tidak ditemukan." };

  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  if (error) return { ok: false, error: "Gagal menghapus gambar." };
  // Baris DB dihapus dulu; aset yatim di Cloudinary lebih aman daripada baris tanpa aset.
  await destroyAsset(config, image.public_id).catch(() => false);

  revalidatePath("/admin/products");
  return { ok: true, data: undefined };
}

const reorderSchema = z.object({
  productId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1).max(50),
});

export async function reorderProductImages(
  input: z.infer<typeof reorderSchema>,
): Promise<ImageActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
      supabase
        .from("product_images")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("product_id", parsed.data.productId),
    ),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "Gagal mengubah urutan." };

  revalidatePath("/admin/products");
  return { ok: true, data: undefined };
}

export async function listProductImages(
  productId: string,
): Promise<
  ImageActionResult<
    { id: string; public_id: string; alt_text: string | null; sort_order: number }[]
  >
> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!z.uuid().safeParse(productId).success) return { ok: false, error: "Data tidak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, public_id, alt_text, sort_order")
    .eq("product_id", productId)
    .order("sort_order");
  if (error) return { ok: false, error: "Gagal memuat gambar." };
  return { ok: true, data: data ?? [] };
}
