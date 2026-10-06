import "server-only";

import { cache } from "react";

import type { CatalogProductCard } from "@/components/catalog/product-card";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, type CatalogParams } from "@/lib/validations/catalog";

import type { ActiveVehicle } from "./vehicle";

/** Konteks halaman katalog di luar query string (rute kategori/brand/promo). */
export type CatalogScope = {
  categorySlug?: string | null;
  brandSlug?: string | null;
  onSale?: boolean;
};

export type CatalogResult = {
  items: CatalogProductCard[];
  total: number;
  page: number;
  pageCount: number;
};

export type CatalogFacets = {
  brands: { slug: string; name: string; count: number }[];
  categories: { slug: string; count: number }[];
  price: { min: number | null; max: number | null };
};

function rpcArgs(params: CatalogParams, scope: CatalogScope, vehicle: ActiveVehicle | null) {
  const brands = scope.brandSlug ? [scope.brandSlug] : params.brands;
  return {
    p_query: params.q ?? undefined,
    p_category_slug: scope.categorySlug ?? undefined,
    p_brand_slugs: brands.length ? brands : undefined,
    p_model_id: vehicle?.modelId,
    p_year: vehicle?.year,
    p_vehicle_only: params.fit && !!vehicle,
    p_min_price: params.min ?? undefined,
    p_max_price: params.max ?? undefined,
    p_in_stock: params.inStock,
    p_min_rating: params.rating ?? undefined,
    p_on_sale: params.onSale || !!scope.onSale,
  };
}

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  average_rating: number;
  review_count: number;
  total_sold: number;
  brand_name: string | null;
  primary_image: string | null;
  has_variants: boolean;
  fit_level: string | null;
  total_count: number;
};

export function toCard(row: SearchRow, vehicle: ActiveVehicle | null): CatalogProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandName: row.brand_name,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    stock: row.stock,
    averageRating: Number(row.average_rating),
    reviewCount: row.review_count,
    totalSold: row.total_sold,
    imagePublicId: row.primary_image,
    hasVariants: row.has_variants,
    fitLevel: row.fit_level === "verified" || row.fit_level === "mentioned" ? row.fit_level : null,
    vehicleLabel: vehicle?.label ?? null,
  };
}

export async function searchCatalog(
  params: CatalogParams,
  scope: CatalogScope,
  vehicle: ActiveVehicle | null,
  pageSize = PAGE_SIZE,
): Promise<CatalogResult> {
  const { data, error } = await createPublicClient().rpc("catalog_search", {
    ...rpcArgs(params, scope, vehicle),
    p_sort: params.sort,
    p_limit: pageSize,
    p_offset: (params.page - 1) * pageSize,
  });
  if (error) throw new Error(`catalog_search: ${error.message}`);
  const rows = (data ?? []) as SearchRow[];
  const total = rows.length ? Number(rows[0]!.total_count) : 0;
  return {
    items: rows.map((r) => toCard(r, vehicle)),
    total,
    page: params.page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCatalogFacets(
  params: CatalogParams,
  scope: CatalogScope,
  vehicle: ActiveVehicle | null,
): Promise<CatalogFacets> {
  const { data, error } = await createPublicClient().rpc(
    "catalog_facets",
    rpcArgs(params, scope, vehicle),
  );
  if (error) throw new Error(`catalog_facets: ${error.message}`);
  const f = (data ?? {}) as Partial<CatalogFacets> & {
    price?: { min: number | null; max: number | null } | null;
  };
  return {
    brands: (f.brands ?? []).map((b) => ({ ...b, count: Number(b.count) })),
    categories: (f.categories ?? []).map((c) => ({ ...c, count: Number(c.count) })),
    price: {
      min: f.price?.min == null ? null : Number(f.price.min),
      max: f.price?.max == null ? null : Number(f.price.max),
    },
  };
}

/** Kartu produk ringkas tanpa filter (beranda: terlaris/terbaru, produk terkait). */
export async function listProductCards(
  opts: {
    sort: "bestseller" | "newest";
    categorySlug?: string;
    limit?: number;
    excludeId?: string;
  },
  vehicle: ActiveVehicle | null,
): Promise<CatalogProductCard[]> {
  const limit = opts.limit ?? 10;
  const { data, error } = await createPublicClient().rpc("catalog_search", {
    p_category_slug: opts.categorySlug,
    p_model_id: vehicle?.modelId,
    p_year: vehicle?.year,
    p_sort: opts.sort,
    p_limit: limit + (opts.excludeId ? 1 : 0),
  });
  if (error) throw new Error(`catalog_search: ${error.message}`);
  return ((data ?? []) as SearchRow[])
    .filter((r) => r.id !== opts.excludeId)
    .slice(0, limit)
    .map((r) => toCard(r, vehicle));
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof fetchProduct>>>;

async function fetchProduct(slug: string) {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      `id, slug, name, sku, price, compare_at_price, stock, short_description, description,
       installation_guide, warranty_info, weight_grams, average_rating, review_count, total_sold,
       meta_title, meta_description, published_at,
       brand:brands(name, slug),
       categories:product_categories(category:categories(id, slug, name)),
       variants:product_variants(id, sku, name, options, price, compare_at_price, stock, is_active, sort_order, image_public_id),
       images:product_images(id, public_id, alt_text, sort_order, variant_id),
       specs:product_specs(label, value, sort_order),
       fitments:product_fitments(id, year_start, year_end, is_verified,
         model:vehicle_models(id, name, slug, year_start, year_end, make:vehicle_makes(name, slug, vehicle_type)))`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`product: ${error.message}`);
  if (!data) return null;
  const categories = (data.categories ?? []).flatMap((pc) => {
    const c = pc.category;
    if (!c) return [];
    return [{ id: c.id, slug: c.slug, name: c.name }];
  });
  return {
    ...data,
    categories,
    price: Number(data.price),
    compare_at_price: data.compare_at_price === null ? null : Number(data.compare_at_price),
    variants: [...(data.variants ?? [])]
      .filter((v) => v.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        ...v,
        price: v.price === null ? null : Number(v.price),
        compare_at_price: v.compare_at_price === null ? null : Number(v.compare_at_price),
      })),
    images: [...(data.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    specs: [...(data.specs ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    fitments: [...(data.fitments ?? [])].sort(
      (a, b) =>
        Number(b.is_verified) - Number(a.is_verified) ||
        (a.model?.make?.name ?? "").localeCompare(b.model?.make?.name ?? "") ||
        (a.model?.name ?? "").localeCompare(b.model?.name ?? ""),
    ),
  };
}

/** Detail produk published (di-cache per request untuk metadata + halaman). */
export const getProductBySlug = cache(fetchProduct);

export type PublicReview = {
  id: string;
  productName: string;
  productSlug: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  reviewer: string;
  createdAt: string;
};

export async function getPublicReviews(
  productId: string | null,
  limit = 6,
): Promise<PublicReview[]> {
  const { data, error } = await createPublicClient().rpc("public_reviews", {
    p_product_id: productId ?? undefined,
    p_limit: limit,
  });
  if (error) throw new Error(`reviews: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    productName: r.product_name,
    productSlug: r.product_slug,
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    reviewer: r.reviewer,
    createdAt: r.created_at,
  }));
}
