import "server-only";

import { cache } from "react";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import {
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
} from "@/lib/data/home-storefront";
import type {
  ProductDetailImage,
  ProductDetailPublic,
  ProductDetailVariant,
  ProductReviewPublic,
  RatingHistogramRow,
} from "@/lib/types/product-detail";

export type {
  ProductDetailBrand,
  ProductDetailCategory,
  ProductDetailImage,
  ProductDetailPublic,
  ProductDetailVariant,
  ProductReviewPublic,
  RatingHistogramRow,
} from "@/lib/types/product-detail";

export { computeVariantUnitPrice, pickDefaultVariantId } from "@/lib/utils/product-detail-pricing";

type BrandRow = { name: string; slug: string } | null;
type CategoryRow = { name: string; slug: string } | null;
type ImageRow = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
};
type VariantRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  reserved: number | null;
  is_active: boolean | null;
  image_url: string | null;
  /** Deprecated — hanya untuk data lama yang belum punya image_url. */
  image_id: string | null;
};
type TagRow = { tag: string };

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function mapImages(rows: ImageRow[] | null | undefined): ProductDetailImage[] {
  if (!rows?.length) return [];
  return [...rows]
    .map((r) => ({
      id: r.id,
      url: r.url,
      alt: r.alt_text,
      sortOrder: r.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export const fetchProductDetailBySlug = cache(async function fetchProductDetailBySlug(
  slug: string,
): Promise<ProductDetailPublic | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        `id, brand_id, category_id, name, slug, description, base_price, sale_price, condition, average_rating, review_count, total_sold, min_order_qty,
         brands:brand_id(name, slug),
         categories:category_id(name, slug),
         product_images(id, url, alt_text, sort_order, is_primary),
         product_variants(id, name, sku, price, stock, weight, reserved, is_active, image_url, image_id),
         product_tags(tag)`,
      )
      .eq("slug", trimmed)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;

    const brand = firstRel(data.brands as BrandRow | BrandRow[] | null);
    const category = firstRel(data.categories as CategoryRow | CategoryRow[] | null);
    const allImages = mapImages(data.product_images as ImageRow[] | null);
    const variantRows =
      (data.product_variants as VariantRow[] | null)?.filter((v) => v.is_active !== false) ?? [];
    const tagRows = (data.product_tags as TagRow[] | null) ?? [];
    const tags = [...new Set(tagRows.map((t) => t.tag).filter(Boolean))];

    // Data lama: varian belum punya image_url, masih menunjuk row product_images
    // lewat image_id (deprecated). Resolve supaya produk existing tetap normal.
    const legacyUrlByImageId = new Map(allImages.map((img) => [img.id, img.url]));

    const variants: ProductDetailVariant[] = variantRows.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: Number(v.price),
      stock: Math.max(0, v.stock - (v.reserved ?? 0)),
      weight: Number(v.weight),
      imageUrl: v.image_url ?? (v.image_id ? (legacyUrlByImageId.get(v.image_id) ?? null) : null),
    }));

    // Foto varian tidak boleh muncul di galeri/carousel foto produk. Untuk data
    // lama foto varian masih berupa row product_images, jadi disaring di sini
    // berdasarkan URL — bukan cuma mengandalkan aturan input di form admin.
    const variantImageUrls = new Set(
      variants.map((v) => v.imageUrl).filter((u): u is string => !!u),
    );
    const images = allImages.filter((img) => !variantImageUrls.has(img.url));

    return {
      id: data.id,
      brandId: data.brand_id ?? null,
      categoryId: data.category_id ?? null,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      basePrice: Number(data.base_price),
      salePrice: data.sale_price != null ? Number(data.sale_price) : null,
      condition: data.condition === "second" ? "second" : "new",
      averageRating: Number(data.average_rating ?? 0),
      reviewCount: data.review_count ?? 0,
      totalSold: data.total_sold ?? 0,
      minOrderQty: Math.max(1, data.min_order_qty ?? 1),
      brand: brand ? { name: brand.name, slug: brand.slug } : null,
      category: category ? { name: category.name, slug: category.slug } : null,
      images,
      variants,
      tags,
    };
  } catch {
    return null;
  }
});

export async function fetchProductReviewsForStore(
  productId: string,
  limit: number,
): Promise<ProductReviewPublic[]> {
  const cap = Math.min(Math.max(limit, 1), 80);
  try {
    const supabase = createServiceClient();
    const { data: rows, error } = await supabase
      .from("product_reviews")
      .select("id, rating, comment, images, created_at, user_id")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(cap);

    if (error || !rows?.length) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const nameByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        const n = p.full_name?.trim();
        if (n) nameByUser.set(p.id, n);
      }
    }

    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      images: r.images ?? [],
      createdAt: r.created_at,
      authorName: nameByUser.get(r.user_id) ?? "Pembeli",
    }));
  } catch {
    return [];
  }
}

export async function fetchRatingHistogram(productId: string): Promise<RatingHistogramRow[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .select("rating")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .is("deleted_at", null);

    if (error || !data?.length) {
      return [5, 4, 3, 2, 1].map((stars) => ({
        stars: stars as RatingHistogramRow["stars"],
        count: 0,
      }));
    }

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of data) {
      const r = row.rating as number;
      if (r >= 1 && r <= 5) counts[r] += 1;
    }
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars: stars as RatingHistogramRow["stars"],
      count: counts[stars] ?? 0,
    }));
  } catch {
    return [5, 4, 3, 2, 1].map((stars) => ({
      stars: stars as RatingHistogramRow["stars"],
      count: 0,
    }));
  }
}

const OTHER_SHELF_SELECT = `id, category_id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(name),
  categories:category_id(name, slug),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

const SAME_CATEGORY_DEFAULT_LIMIT = 5;
const SAME_CATEGORY_MAX_LIMIT = 10;

/** Produk lain di kategori yang sama, buat section "Mungkin kamu suka ini!" di halaman detail produk. */
export async function fetchSameCategoryProducts(params: {
  currentProductId: string;
  categoryId: string | null;
  limit?: number;
}): Promise<HomeShelfProduct[]> {
  if (!params.categoryId) return [];
  const limit = Math.min(
    Math.max(params.limit ?? SAME_CATEGORY_DEFAULT_LIMIT, 1),
    SAME_CATEGORY_MAX_LIMIT,
  );

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select(OTHER_SHELF_SELECT)
      .eq("category_id", params.categoryId)
      .neq("id", params.currentProductId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) return [];

    const shelves: HomeShelfProduct[] = [];
    for (const raw of data) {
      const shelf = productRowToShelf(raw as unknown as ProductQueryRow);
      if (shelf) shelves.push(shelf);
    }
    return shelves;
  } catch {
    return [];
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
}

const CART_CROSS_SELL_POOL = 96;

/**
 * Produk acak untuk keranjang: hindari kategori yang sudah ada di isi keranjang,
 * dan hindari produk yang sedang ada di keranjang.
 */
export async function fetchCartCrossSellProducts(params: {
  excludedCategoryIds: string[];
  excludedProductIds: string[];
  limit?: number;
}): Promise<HomeShelfProduct[]> {
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 10);
  const excludeCats = new Set(params.excludedCategoryIds.filter(Boolean));
  const excludeProducts = new Set(params.excludedProductIds.filter(Boolean));

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select(OTHER_SHELF_SELECT)
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(CART_CROSS_SELL_POOL);

    if (error || !data?.length) return [];

    const shelves: HomeShelfProduct[] = [];
    for (const raw of data) {
      const row = raw as unknown as ProductQueryRow & { category_id?: string | null };
      const cid = row.category_id ?? null;
      if (cid && excludeCats.has(cid)) continue;
      if (excludeProducts.has(row.id)) continue;
      const shelf = productRowToShelf(row as ProductQueryRow);
      if (shelf) shelves.push(shelf);
    }

    if (shelves.length < limit) {
      const picked = new Set(shelves.map((s) => s.productId));
      for (const raw of data) {
        if (shelves.length >= limit) break;
        const row = raw as unknown as ProductQueryRow & { category_id?: string | null };
        if (excludeProducts.has(row.id)) continue;
        if (picked.has(row.id)) continue;
        const shelf = productRowToShelf(row as ProductQueryRow);
        if (shelf) {
          shelves.push(shelf);
          picked.add(row.id);
        }
      }
    }

    shuffleInPlace(shelves);
    return shelves.slice(0, limit);
  } catch {
    return [];
  }
}
