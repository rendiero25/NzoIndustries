"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type ImageInput = {
  url: string;
  is_primary: boolean;
  alt_text: string;
  sort_order: number;
};

export type VariantInput = {
  id?: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  is_active: boolean;
  image_url: string;
};

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  base_price: number;
  sale_price: number | null;
  min_order_qty: number;
  category_id: string | null;
  brand_id: string | null;
  condition: "new" | "second";
  is_active: boolean;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  images: ImageInput[];
  variants: VariantInput[];
  tags: string[];
};

type ActionResult = { error: string } | { id: string };

function normalizeSku(sku: string) {
  return sku.trim();
}

function findDuplicateSku(variants: VariantInput[]) {
  const seen = new Map<string, number>();

  for (let i = 0; i < variants.length; i += 1) {
    const key = normalizeSku(variants[i].sku).toLowerCase();
    if (!key) continue;

    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      return `SKU varian ${i + 1} duplikat dengan varian ${firstIndex + 1}.`;
    }

    seen.set(key, i);
  }

  return null;
}

export async function createProduct(data: ProductInput): Promise<ActionResult> {
  const supabase = await createServiceClient();
  const duplicateSkuError = findDuplicateSku(data.variants);
  if (duplicateSkuError) return { error: duplicateSkuError };
  const normalizedVariants = data.variants.map((v) => ({
    ...v,
    sku: normalizeSku(v.sku),
  }));

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      base_price: data.base_price,
      sale_price: data.sale_price,
      min_order_qty: data.min_order_qty,
      category_id: data.category_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.brand_id !== undefined && ({ brand_id: data.brand_id } as any)),
      condition: data.condition,
      is_active: data.is_active,
      is_featured: data.is_featured,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan produk lain." };
    return { error: error.message };
  }

  // Foto produk & foto varian terpisah: foto varian disimpan sebagai URL di
  // product_variants dan tidak pernah jadi row product_images.
  if (data.images.length > 0) {
    const { error: imagesError } = await supabase.from("product_images").insert(
      data.images.map((img, i) => ({
        product_id: product.id,
        url: img.url,
        is_primary: img.is_primary,
        alt_text: img.alt_text || null,
        sort_order: i,
      })),
    );

    if (imagesError) {
      await supabase.from("products").delete().eq("id", product.id);
      return { error: `Gagal menyimpan gambar: ${imagesError.message}` };
    }
  }

  for (const v of normalizedVariants) {
    if (!v.image_url) {
      await supabase.from("products").delete().eq("id", product.id);
      return {
        error: "Setiap varian wajib punya foto. Upload foto untuk varian yang masih kosong.",
      };
    }
  }

  const { error: variantsError } = await supabase.from("product_variants").insert(
    normalizedVariants.map((v) => ({
      product_id: product.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length,
      width: v.width,
      height: v.height,
      is_active: v.is_active,
      image_url: v.image_url,
    })),
  );

  if (variantsError) {
    await supabase.from("products").delete().eq("id", product.id);
    if (variantsError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
    return { error: `Gagal menyimpan varian: ${variantsError.message}` };
  }

  if (data.tags.length > 0) {
    await supabase
      .from("product_tags")
      .insert(data.tags.map((tag) => ({ product_id: product.id, tag })));
  }

  revalidatePath("/admin/products");
  return { id: product.id };
}

export async function updateProduct(id: string, data: ProductInput): Promise<ActionResult> {
  const supabase = await createServiceClient();
  const duplicateSkuError = findDuplicateSku(data.variants);
  if (duplicateSkuError) return { error: duplicateSkuError };

  const normalizedVariants = data.variants.map((v) => ({
    ...v,
    sku: normalizeSku(v.sku),
  }));

  // Pre-flight sebelum mutasi apa pun: foto varian wajib ada. Foto varian
  // berdiri sendiri (URL di product_variants), jadi tidak perlu — dan tidak
  // boleh — dicocokkan ke galeri foto produk.
  for (const v of normalizedVariants) {
    if (!v.image_url) {
      return {
        error: "Setiap varian wajib punya foto. Upload foto untuk varian yang masih kosong.",
      };
    }
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      base_price: data.base_price,
      sale_price: data.sale_price,
      min_order_qty: data.min_order_qty,
      category_id: data.category_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(data.brand_id !== undefined && ({ brand_id: data.brand_id } as any)),
      condition: data.condition,
      is_active: data.is_active,
      is_featured: data.is_featured,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan produk lain." };
    return { error: error.message };
  }

  // Replace images (galeri produk saja — foto varian tidak ikut di sini)
  await supabase.from("product_images").delete().eq("product_id", id);
  if (data.images.length > 0) {
    const { error: imagesError } = await supabase.from("product_images").insert(
      data.images.map((img, i) => ({
        product_id: id,
        url: img.url,
        is_primary: img.is_primary,
        alt_text: img.alt_text || null,
        sort_order: i,
      })),
    );

    if (imagesError) {
      return { error: `Gagal menyimpan gambar: ${imagesError.message}` };
    }
  }

  // Variants: get all existing IDs for this product, including inactive variants
  // that are hidden from the form but still hold globally-unique SKUs.
  const { data: existingVariants, error: existingVariantsError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id);

  if (existingVariantsError) {
    return { error: `Gagal membaca varian produk: ${existingVariantsError.message}` };
  }

  const existingIds = existingVariants?.map((v) => v.id) ?? [];
  const incomingIds = normalizedVariants
    .filter((v) => v.id && existingIds.includes(v.id))
    .map((v) => v.id!);
  const removedIds = existingIds.filter((eid) => !incomingIds.includes(eid));
  const incomingSkus = normalizedVariants.map((v) => v.sku).filter(Boolean);

  if (incomingSkus.length > 0) {
    const { data: skuConflicts, error: skuConflictError } = await supabase
      .from("product_variants")
      .select("id, sku, product_id")
      .in("sku", incomingSkus)
      .neq("product_id", id)
      .limit(1);

    if (skuConflictError) {
      return { error: `Gagal memeriksa SKU varian: ${skuConflictError.message}` };
    }

    if ((skuConflicts?.length ?? 0) > 0) {
      return { error: "SKU varian sudah digunakan produk lain." };
    }
  }

  // Phase 1: Temporarily clear every SKU owned by this product, including
  // inactive/removed variants. The database has a global UNIQUE constraint on
  // product_variants.sku, so hidden inactive rows can still block a valid save.
  if (existingIds.length > 0) {
    const phase1Results = await Promise.all(
      existingIds.map((variantId) =>
        supabase
          .from("product_variants")
          .update({ sku: `__tmp_${id}_${variantId}` })
          .eq("id", variantId)
          .eq("product_id", id),
      ),
    );
    const phase1Err = phase1Results.find((r) => r.error);
    if (phase1Err?.error) {
      return { error: `Gagal memproses varian: ${phase1Err.error.message}` };
    }
  }

  if (removedIds.length > 0) {
    await supabase.from("product_variants").update({ is_active: false }).in("id", removedIds);
  }

  // Phase 2: Apply actual values. All temp SKUs are now cleared so real SKUs can
  // be set freely; a 23505 here only means a genuine external conflict/race.
  for (const v of normalizedVariants) {
    if (v.id && existingIds.includes(v.id)) {
      const { error: updateVariantError } = await supabase
        .from("product_variants")
        .update({
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          weight: v.weight,
          length: v.length,
          width: v.width,
          height: v.height,
          is_active: v.is_active,
          image_url: v.image_url,
        })
        .eq("id", v.id)
        .eq("product_id", id);
      if (updateVariantError) {
        if (updateVariantError.code === "23505")
          return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal memperbarui varian: ${updateVariantError.message}` };
      }
    } else {
      const { error: insertVariantError } = await supabase.from("product_variants").insert({
        product_id: id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        weight: v.weight,
        length: v.length,
        width: v.width,
        height: v.height,
        is_active: v.is_active,
        image_url: v.image_url,
      });
      if (insertVariantError) {
        if (insertVariantError.code === "23505")
          return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal menambah varian: ${insertVariantError.message}` };
      }
    }
  }

  // Replace tags
  await supabase.from("product_tags").delete().eq("product_id", id);
  if (data.tags.length > 0) {
    await supabase.from("product_tags").insert(data.tags.map((tag) => ({ product_id: id, tag })));
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  return { id };
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}

export async function toggleProductStatus(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}

export async function bulkDeleteProducts(ids: string[]): Promise<{ error?: string }> {
  if (!ids.length) return {};
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .in("id", ids);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}

export async function bulkSetBrand(
  ids: string[],
  brandId: string | null,
): Promise<{ error?: string }> {
  if (!ids.length) return {};
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ brand_id: brandId } as any)
    .in("id", ids);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}

export async function bulkSetStatus(ids: string[], isActive: boolean): Promise<{ error?: string }> {
  if (!ids.length) return {};
  const supabase = await createServiceClient();

  const { error } = await supabase.from("products").update({ is_active: isActive }).in("id", ids);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}

export async function bulkSetCondition(
  ids: string[],
  condition: "new" | "second",
): Promise<{ error?: string }> {
  if (!ids.length) return {};
  const supabase = await createServiceClient();

  const { error } = await supabase.from("products").update({ condition }).in("id", ids);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}
