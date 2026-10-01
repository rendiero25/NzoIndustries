import "server-only";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";
import {
  fetchTemplateBanners,
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
  type StoreBanner,
} from "@/lib/data/home-storefront";

export const BRAND_STORE_PRODUCTS_PER_PAGE = 15;

export type BrandStorePublicBrand = {
  id: string;
  name: string;
  slug: string;
};

export type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";

const PRODUCT_SHELF_SELECT = `id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(name),
  categories:category_id(name),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

const SORT_KEYS = new Set<BrandStoreSortKey>([
  "latest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "best_selling",
]);

function normalizeSort(raw: string | undefined): BrandStoreSortKey {
  if (raw && SORT_KEYS.has(raw as BrandStoreSortKey)) return raw as BrandStoreSortKey;
  return "latest";
}

export async function fetchBrandBySlugForStore(
  slug: string,
): Promise<BrandStorePublicBrand | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
    };
  } catch {
    return null;
  }
}

export async function fetchBrandCategoryFilters(
  brandId: string,
): Promise<BrandStoreCategoryOption[]> {
  try {
    const supabase = createServiceClient();
    const { data: rows, error } = await supabase
      .from("products")
      .select("category_id")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error || !rows?.length) return [];
    const ids = [
      ...new Set(rows.map((r) => r.category_id).filter((id): id is string => id != null)),
    ];
    if (ids.length === 0) return [];
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id, name, slug")
      .in("id", ids)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (catErr || !cats) return [];
    return cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  } catch {
    return [];
  }
}

export type BrandProductsPageResult = {
  products: HomeShelfProduct[];
  totalCount: number;
};

export async function fetchBrandProductsPage(params: {
  brandId: string;
  page: number;
  categoryId: string | null;
  condition: string | null;
  discountOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  sort: string;
}): Promise<BrandProductsPageResult> {
  const page = Math.max(1, params.page);
  const sort = normalizeSort(params.sort);
  const categoryId = params.categoryId?.trim() || null;
  const from = (page - 1) * BRAND_STORE_PRODUCTS_PER_PAGE;
  const to = from + BRAND_STORE_PRODUCTS_PER_PAGE - 1;

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("products")
      .select(PRODUCT_SHELF_SELECT, { count: "exact" })
      .eq("brand_id", params.brandId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    if (params.condition) {
      query = query.eq("condition", params.condition);
    }
    if (params.discountOnly) {
      // Proksi "sale_price terisi" — sama seperti fetchProductsCatalogPage,
      // PostgREST tidak bisa bandingkan sale_price < base_price langsung.
      query = query.not("sale_price", "is", null);
    }
    if (params.minPrice != null) {
      query = query.gte("base_price", params.minPrice);
    }
    if (params.maxPrice != null) {
      query = query.lte("base_price", params.maxPrice);
    }
    if (params.minRating != null) {
      query = query.gte("average_rating", params.minRating);
    }

    switch (sort) {
      case "price-asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "name-asc":
        query = query.order("name", { ascending: true });
        break;
      case "name-desc":
        query = query.order("name", { ascending: false });
        break;
      case "best_selling":
        query = query.order("total_sold", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(from, to);
    if (error || !data) {
      return { products: [], totalCount: 0 };
    }
    const rows = data as unknown as ProductQueryRow[];
    const products: HomeShelfProduct[] = [];
    for (const row of rows) {
      const shelf = productRowToShelf(row);
      if (shelf) products.push(shelf);
    }
    return { products, totalCount: count ?? 0 };
  } catch {
    return { products: [], totalCount: 0 };
  }
}

export async function fetchPreFooterBanners(): Promise<StoreBanner[]> {
  return fetchTemplateBanners("pre_footer");
}
