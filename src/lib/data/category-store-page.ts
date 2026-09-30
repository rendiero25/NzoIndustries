import "server-only";

import { cache } from "react";

import { createServiceClient } from "@/lib/supabase/server";
import {
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
} from "@/lib/data/home-storefront";

/** Select konsisten dengan shelf brand + `brand_id` & metadata brand untuk pengelompokan. */
const CATEGORY_PRODUCT_SELECT = `id, brand_id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(id, name, slug, logo_url),
  categories:category_id(name),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

const CATEGORY_PRODUCTS_CAP = 500;

export type CategoryStorePublicCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CategoryBrandShelfGroup = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  logoUrl: string | null;
  products: HomeShelfProduct[];
};

type BrandNested = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
} | null;

type CategoryProductRow = ProductQueryRow & {
  brand_id: string | null;
  brands: BrandNested | BrandNested[];
};

function firstBrand(rel: BrandNested | BrandNested[] | null | undefined): BrandNested {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function fetchActiveCategoriesForProductIndex(): Promise<
  CategoryStorePublicCategory[]
> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export const fetchCategoryBySlugForStore = cache(async function fetchCategoryBySlugForStore(
  slug: string,
): Promise<CategoryStorePublicCategory | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("slug", trimmed)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, slug: data.slug };
  } catch {
    return null;
  }
});

export async function fetchCategoryProductsGroupedByBrand(
  categoryId: string,
): Promise<CategoryBrandShelfGroup[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select(CATEGORY_PRODUCT_SELECT)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(CATEGORY_PRODUCTS_CAP);

    if (error || !data?.length) return [];

    type Accum = {
      brandId: string;
      brandName: string;
      brandSlug: string;
      logoUrl: string | null;
      products: HomeShelfProduct[];
    };

    const map = new Map<string, Accum>();

    for (const raw of data as unknown as CategoryProductRow[]) {
      const brandId = raw.brand_id?.trim();
      if (!brandId) continue;
      const shelf = productRowToShelf(raw as ProductQueryRow);
      if (!shelf) continue;

      const b = firstBrand(raw.brands);
      const brandName = b?.name?.trim() || "Brand";
      const brandSlug = b?.slug?.trim() || "";
      const logoUrl = b?.logo_url ?? null;

      const existing = map.get(brandId);
      if (existing) {
        existing.products.push(shelf);
      } else {
        map.set(brandId, {
          brandId,
          brandName,
          brandSlug,
          logoUrl,
          products: [shelf],
        });
      }
    }

    const groups = [...map.values()].sort((a, b) =>
      a.brandName.localeCompare(b.brandName, "id", { sensitivity: "base" }),
    );

    for (const g of groups) {
      g.products.sort((a, b) => {
        const sold = b.soldCount - a.soldCount;
        if (sold !== 0) return sold;
        return b.rating - a.rating;
      });
    }

    return groups;
  } catch {
    return [];
  }
}
