"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  bulkActionSchema,
  fitmentSchema,
  productCoreSchema,
  specsSchema,
  variantsSchema,
  type BulkActionInput,
  type ProductCoreInput,
  type VariantInput,
} from "@/lib/validations/admin-product";
import { CATALOG_TAG } from "@/server/queries/reference";

import { adminGuard, ROLES, rpcMessage } from "./_guard";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
const idSchema = z.uuid();

function refresh(productId?: string, slug?: string) {
  revalidateTag(CATALOG_TAG, "max");
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  if (slug) revalidatePath(`/products/${slug}`);
}

function uniqueMessage(message: string | undefined, fallback: string) {
  if (message?.includes("products_slug_key")) return "Slug sudah dipakai produk lain.";
  if (message?.includes("products_sku_key") || message?.includes("product_variants_sku_key"))
    return "SKU sudah dipakai.";
  return fallback;
}

/** Simpan data utama produk (baru bila `id` kosong). Edit admin mengunci dari import ulang (D-24). */
export async function saveProduct(
  input: ProductCoreInput & { id?: string },
): Promise<
  { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = productCoreSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi data produk.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    name: v.name,
    slug: v.slug,
    sku: v.sku,
    status: v.status,
    brand_id: v.brandId,
    price: v.price,
    compare_at_price: v.compareAtPrice,
    short_description: v.shortDescription ?? null,
    description: v.description ?? null,
    installation_guide: v.installationGuide ?? null,
    warranty_info: v.warrantyInfo ?? null,
    weight_grams: v.weightGrams,
    length_mm: v.lengthMm,
    width_mm: v.widthMm,
    height_mm: v.heightMm,
    meta_title: v.metaTitle ?? null,
    meta_description: v.metaDescription ?? null,
    import_locked: true,
  };

  let productId = input.id;
  if (productId) {
    if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produk tidak valid." };
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return { ok: false, error: uniqueMessage(error.message, "Produk gagal disimpan.") };
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error || !data)
      return { ok: false, error: uniqueMessage(error?.message, "Produk gagal dibuat.") };
    productId = data.id;
    if (v.initialStock && v.initialStock > 0) {
      await supabase.from("inventory_movements").insert({
        product_id: productId,
        quantity: v.initialStock,
        type: "initial",
        reason: "Stok awal produk baru",
        created_by: guard.user.id,
      });
    }
  }

  // Kategori: ganti seluruhnya.
  await supabase.from("product_categories").delete().eq("product_id", productId);
  if (v.categoryIds.length) {
    const { error } = await supabase
      .from("product_categories")
      .insert(v.categoryIds.map((category_id) => ({ product_id: productId!, category_id })));
    if (error) return { ok: false, error: "Kategori gagal disimpan." };
  }
  refresh(productId, v.slug);
  return { ok: true, id: productId };
}

/**
 * Simpan varian: update/insert; varian yang dihapus dari form dinonaktifkan
 * (tidak dihapus karena ledger stok & pesanan merujuknya).
 */
export async function saveVariants(productId: string, variants: VariantInput[]): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produk tidak valid." };
  const parsed = variantsSchema.safeParse(variants);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Varian tidak valid." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  const keep = new Set(parsed.data.filter((x) => x.id).map((x) => x.id!));

  for (const [i, v] of parsed.data.entries()) {
    const row = {
      product_id: productId,
      name: v.name,
      sku: v.sku,
      price: v.price,
      compare_at_price: v.compareAtPrice,
      weight_grams: v.weightGrams,
      is_active: v.isActive,
      sort_order: i,
    };
    if (v.id) {
      const { error } = await supabase
        .from("product_variants")
        .update(row)
        .eq("id", v.id)
        .eq("product_id", productId);
      if (error)
        return {
          ok: false,
          error: uniqueMessage(error.message, `Varian "${v.name}" gagal disimpan.`),
        };
    } else {
      const { data, error } = await supabase
        .from("product_variants")
        .insert(row)
        .select("id")
        .single();
      if (error || !data)
        return {
          ok: false,
          error: uniqueMessage(error?.message, `Varian "${v.name}" gagal dibuat.`),
        };
      if (v.initialStock && v.initialStock > 0) {
        await supabase.from("inventory_movements").insert({
          product_id: productId,
          variant_id: data.id,
          quantity: v.initialStock,
          type: "initial",
          reason: "Stok awal varian baru",
          created_by: guard.user.id,
        });
      }
    }
  }
  const removed = (existing ?? []).filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (removed.length) {
    await supabase.from("product_variants").update({ is_active: false }).in("id", removed);
  }
  await supabase.from("products").update({ import_locked: true }).eq("id", productId);
  refresh(productId);
  return { ok: true };
}

export async function saveSpecs(
  productId: string,
  specs: { label: string; value: string }[],
): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produk tidak valid." };
  const parsed = specsSchema.safeParse(specs);
  if (!parsed.success)
    return { ok: false, error: "Spesifikasi tidak valid (label & nilai wajib)." };
  const supabase = await createClient();
  await supabase.from("product_specs").delete().eq("product_id", productId);
  if (parsed.data.length) {
    const { error } = await supabase
      .from("product_specs")
      .insert(
        parsed.data.map((s, i) => ({
          product_id: productId,
          label: s.label,
          value: s.value,
          sort_order: i,
        })),
      );
    if (error) return { ok: false, error: "Spesifikasi gagal disimpan." };
  }
  refresh(productId);
  return { ok: true };
}

export async function addFitment(
  productId: string,
  input: z.input<typeof fitmentSchema>,
): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produk tidak valid." };
  const parsed = fitmentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Fitment tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("product_fitments").insert({
    product_id: productId,
    model_id: parsed.data.modelId,
    year_start: parsed.data.yearStart,
    year_end: parsed.data.yearEnd,
    notes: parsed.data.notes ?? null,
    is_verified: true,
    source: "admin",
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Fitment ini sudah ada." : "Fitment gagal disimpan.",
    };
  }
  refresh(productId);
  return { ok: true };
}

/** Konfirmasi saran fitment import (D-27) atau hapus fitment. */
export async function updateFitment(input: {
  id: string;
  productId: string;
  action: "verify" | "remove";
}): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = z
    .object({ id: z.uuid(), productId: z.uuid(), action: z.enum(["verify", "remove"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fitment tidak valid." };
  const supabase = await createClient();
  const q =
    parsed.data.action === "verify"
      ? supabase.from("product_fitments").update({ is_verified: true, source: "admin" })
      : supabase.from("product_fitments").delete();
  const { error } = await q.eq("id", parsed.data.id).eq("product_id", parsed.data.productId);
  if (error) return { ok: false, error: "Fitment gagal diperbarui." };
  refresh(parsed.data.productId);
  return { ok: true };
}

export async function duplicateProduct(
  productId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produk tidak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_duplicate_product", {
    p_product_id: productId,
  });
  if (error || !data) return { ok: false, error: rpcMessage(error, "Produk gagal diduplikat.") };
  revalidatePath("/admin/products");
  return { ok: true, id: data };
}

/** Bulk action daftar produk (publish/draft/arsip, diskon D-38, brand, kategori). */
export async function bulkProducts(
  input: BulkActionInput,
): Promise<{ ok: true; affected: number } | { ok: false; error: string }> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = bulkActionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Aksi tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  if (v.action === "publish" || v.action === "draft" || v.action === "archive") {
    const status =
      v.action === "publish" ? "published" : v.action === "draft" ? "draft" : "archived";
    const { error } = await supabase.from("products").update({ status }).in("id", v.ids);
    if (error) return { ok: false, error: "Status gagal diubah." };
    refresh();
    return { ok: true, affected: v.ids.length };
  }
  if (v.action === "discount") {
    if (!v.ids.length && !v.categoryId) return { ok: false, error: "Pilih produk atau kategori." };
    const { data, error } = await supabase.rpc("admin_bulk_discount", {
      p_product_ids: v.ids,
      // Kolom nullable: RPC menerima null (tipe gen menganggap wajib).
      p_category_id: v.categoryId as string,
      p_mode: v.mode,
      p_value: v.value,
    });
    if (error) return { ok: false, error: rpcMessage(error, "Diskon gagal diterapkan.") };
    refresh();
    return { ok: true, affected: data ?? 0 };
  }
  if (v.action === "brand") {
    const { error } = await supabase
      .from("products")
      .update({ brand_id: v.brandId })
      .in("id", v.ids);
    if (error) return { ok: false, error: "Brand gagal diubah." };
    refresh();
    return { ok: true, affected: v.ids.length };
  }
  if (v.action !== "category") return { ok: false, error: "Aksi tidak dikenal." };
  const categoryId = v.categoryId;
  const { error } = await supabase.from("product_categories").upsert(
    v.ids.map((product_id) => ({ product_id, category_id: categoryId })),
    { ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: "Kategori gagal ditambahkan." };
  refresh();
  return { ok: true, affected: v.ids.length };
}
