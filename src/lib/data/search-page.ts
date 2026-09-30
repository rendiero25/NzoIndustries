import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
} from "@/lib/data/home-storefront";
import {
  fetchCategoryProductsGroupedByBrand,
  type CategoryBrandShelfGroup,
} from "@/lib/data/category-store-page";

const SEARCH_SELECT = `id, brand_id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(id, name, slug, logo_url),
  categories:category_id(name),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

export type SearchResultCategory = {
  id: string;
  name: string;
  slug: string;
  groups: CategoryBrandShelfGroup[];
};

export type SearchResultBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  products: HomeShelfProduct[];
};

export type SearchPageResult = {
  query: string;
  categories: SearchResultCategory[];
  brands: SearchResultBrand[];
  looseProducts: HomeShelfProduct[];
  totalCount: number;
};

export async function fetchSearchResults(rawQuery: string): Promise<SearchPageResult> {
  const q = rawQuery.trim();
  const pattern = `%${q}%`;
  const supabase = createServiceClient();

  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    supabase
      .from("products")
      .select(SEARCH_SELECT)
      .eq("is_active", true)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .order("total_sold", { ascending: false })
      .limit(200),
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .ilike("name", pattern),
    supabase.from("brands").select("id, name, slug, logo_url").ilike("name", pattern),
  ]);

  const matchedCategories = (categoriesRes.data ?? []) as {
    id: string;
    name: string;
    slug: string;
  }[];
  const matchedBrands = (brandsRes.data ?? []) as {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  }[];

  const [categoryGroupsList, brandProductsList] = await Promise.all([
    Promise.all(
      matchedCategories.map((cat) =>
        fetchCategoryProductsGroupedByBrand(cat.id).then((groups) => ({ cat, groups })),
      ),
    ),
    Promise.all(
      matchedBrands.map((brand) =>
        supabase
          .from("products")
          .select(SEARCH_SELECT)
          .eq("brand_id", brand.id)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("total_sold", { ascending: false })
          .limit(50)
          .then(({ data }) => ({ brand, rows: data ?? [] })),
      ),
    ),
  ]);

  const categories: SearchResultCategory[] = categoryGroupsList
    .filter(({ groups }) => groups.length > 0)
    .map(({ cat, groups }) => ({ ...cat, groups }));

  const shownIds = new Set<string>();
  for (const cat of categories) {
    for (const g of cat.groups) {
      for (const p of g.products) shownIds.add(p.productId);
    }
  }

  const brands: SearchResultBrand[] = brandProductsList
    .map(({ brand, rows }) => {
      const products: HomeShelfProduct[] = [];
      for (const raw of rows as unknown as ProductQueryRow[]) {
        if (shownIds.has(raw.id)) continue;
        const shelf = productRowToShelf(raw);
        if (shelf) {
          products.push(shelf);
          shownIds.add(raw.id);
        }
      }
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logo_url,
        products,
      };
    })
    .filter((b) => b.products.length > 0);

  const looseProducts: HomeShelfProduct[] = [];
  for (const raw of (productsRes.data ?? []) as unknown as ProductQueryRow[]) {
    if (shownIds.has(raw.id)) continue;
    const shelf = productRowToShelf(raw);
    if (shelf) {
      looseProducts.push(shelf);
      shownIds.add(raw.id);
    }
  }

  return { query: q, categories, brands, looseProducts, totalCount: shownIds.size };
}
