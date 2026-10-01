import "server-only";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import {
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
} from "@/lib/data/home-storefront";

export const PRODUCTS_CATALOG_PER_PAGE = 20;

export type ProductsCatalogSortKey =
  "latest" | "price-asc" | "price-desc" | "best_selling" | "popular";

export type ProductsCatalogBrandOption = {
  id: string;
  name: string;
  slug: string;
};

const SORT_KEYS = new Set<ProductsCatalogSortKey>([
  "latest",
  "price-asc",
  "price-desc",
  "best_selling",
  "popular",
]);

export function normalizeProductsCatalogSort(raw: string | undefined): ProductsCatalogSortKey {
  if (raw && SORT_KEYS.has(raw as ProductsCatalogSortKey)) return raw as ProductsCatalogSortKey;
  return "latest";
}

const PRODUCT_SHELF_SELECT = `id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(name),
  categories:category_id(name),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

export async function fetchActiveBrandsForCatalog(): Promise<ProductsCatalogBrandOption[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error || !data) return [];
    return data.map((b) => ({ id: b.id, name: b.name, slug: b.slug }));
  } catch {
    return [];
  }
}

export type ProductsCatalogFilters = {
  page: number;
  /** Array dipakai untuk gabungan beberapa kategori sekaligus (mis. nav "Headset" = headphone + earphone). */
  categoryId: string | string[] | null;
  brandId: string | null;
  condition: string | null;
  discountOnly: boolean;
  sort: string | undefined;
  /** Rupiah. Difilter terhadap `base_price` (lihat catatan di fetchProductsCatalogPage). */
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
};

export type ProductsCatalogPageResult = {
  products: HomeShelfProduct[];
  totalCount: number;
};

/**
 * Filter harga dicocokkan ke kolom `base_price` (bukan harga efektif setelah
 * varian/diskon) — pendekatan yang sama dipakai sort harga di brand-store-page.ts.
 * Cukup akurat untuk mayoritas katalog; varian dengan harga jauh dari base_price
 * adalah kasus tepi yang belum ditangani persis.
 */
export async function fetchProductsCatalogPage(
  filters: ProductsCatalogFilters,
): Promise<ProductsCatalogPageResult> {
  const page = Math.max(1, filters.page);
  const sort = normalizeProductsCatalogSort(filters.sort);
  const from = (page - 1) * PRODUCTS_CATALOG_PER_PAGE;
  const to = from + PRODUCTS_CATALOG_PER_PAGE - 1;

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("products")
      .select(PRODUCT_SHELF_SELECT, { count: "exact" })
      .eq("is_active", true)
      .is("deleted_at", null);

    if (Array.isArray(filters.categoryId)) {
      if (filters.categoryId.length === 1) query = query.eq("category_id", filters.categoryId[0]);
      else if (filters.categoryId.length > 1) query = query.in("category_id", filters.categoryId);
    } else if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }
    if (filters.brandId) {
      query = query.eq("brand_id", filters.brandId);
    }
    if (filters.condition) {
      query = query.eq("condition", filters.condition);
    }
    if (filters.discountOnly) {
      // Pendekatan sama dengan catatan minPrice/maxPrice di atas: PostgREST tidak
      // bisa bandingkan dua kolom (sale_price < base_price) langsung, jadi dipakai
      // proksi "sale_price terisi" — cukup akurat karena sale_price hanya diisi saat diskon aktif.
      query = query.not("sale_price", "is", null);
    }
    if (filters.minPrice != null) {
      query = query.gte("base_price", filters.minPrice);
    }
    if (filters.maxPrice != null) {
      query = query.lte("base_price", filters.maxPrice);
    }
    if (filters.minRating != null) {
      query = query.gte("average_rating", filters.minRating);
    }

    switch (sort) {
      case "price-asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "best_selling":
        query = query.order("total_sold", { ascending: false });
        break;
      case "popular":
        query = query
          .order("average_rating", { ascending: false })
          .order("review_count", { ascending: false });
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
