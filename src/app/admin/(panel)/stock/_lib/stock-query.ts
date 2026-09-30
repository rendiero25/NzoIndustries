import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export const STOCK_DEFAULT_SORT = "stock-asc";

export type StockListFilters = {
  q: string;
  brandId: string;
  categoryId: string;
  sort: string;
  alertOnly: boolean;
};

const VARIANT_SELECT =
  "id, name, sku, stock, reserved, is_active, products!inner(name, slug, brand_id, category_id)";

const COUNT_SELECT = "id, products!inner(brand_id, category_id)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStockFilters(query: any, filters: StockListFilters) {
  let next = query.eq("is_active", true);

  if (filters.alertOnly) {
    next = next.lt("stock", 5);
  }

  if (filters.brandId) {
    next = next.eq("products.brand_id", filters.brandId);
  }

  if (filters.categoryId) {
    next = next.eq("products.category_id", filters.categoryId);
  }

  const term = filters.q.trim();
  if (term) {
    next = next.or(`name.ilike.%${term}%,sku.ilike.%${term}%,products.name.ilike.%${term}%`);
  }

  return next;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStockSort(query: any, sort: string) {
  switch (sort) {
    case "stock-desc":
      return query.order("stock", { ascending: false });
    case "name-asc":
      return query.order("name", { ascending: true });
    case "name-desc":
      return query.order("name", { ascending: false });
    case "product-asc":
      return query.order("name", { ascending: true, foreignTable: "products" });
    case "product-desc":
      return query.order("name", { ascending: false, foreignTable: "products" });
    case "sku-asc":
      return query.order("sku", { ascending: true });
    case "sku-desc":
      return query.order("sku", { ascending: false });
    default:
      return query.order("stock", { ascending: true });
  }
}

export function buildStockVariantCountQuery(
  supabase: SupabaseClient<Database>,
  filters: StockListFilters,
) {
  const base = supabase
    .from("product_variants")
    .select(COUNT_SELECT, { count: "exact", head: true });

  return applyStockFilters(base, filters);
}

export function buildStockVariantListQuery(
  supabase: SupabaseClient<Database>,
  filters: StockListFilters,
) {
  const base = supabase.from("product_variants").select(VARIANT_SELECT);
  return applyStockSort(applyStockFilters(base, filters), filters.sort);
}
