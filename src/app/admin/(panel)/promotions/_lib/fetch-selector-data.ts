import { createServiceClient } from "@/lib/supabase/server";
import type { ProductOption, BrandOption } from "../_components/product-brand-selector";

export async function fetchSelectorData() {
  const supabase = createServiceClient();

  const [{ data: rawProducts }, { data: rawBrands }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, condition, average_rating, review_count, total_sold, brands:brand_id(name), categories:category_id(id, name), product_variants(price)",
      )
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const categoryMap = new Map<string, string>();

  const products: ProductOption[] = (rawProducts ?? []).map((p) => {
    const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
    const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
    const typedCategory = category as { id: string; name: string } | null | undefined;
    const variants = (p.product_variants ?? []) as { price: number }[];
    const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;
    if (typedCategory) categoryMap.set(typedCategory.id, typedCategory.name);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: minPrice,
      brand_name: (brand as { name: string } | null)?.name ?? null,
      condition: p.condition ?? "new",
      image_url: null,
      category_id: typedCategory?.id ?? null,
      category_name: typedCategory?.name ?? null,
      average_rating: p.average_rating ?? 0,
      review_count: p.review_count ?? 0,
      total_sold: p.total_sold ?? 0,
    };
  });

  const brands: BrandOption[] = (rawBrands ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    product_count: 0,
  }));

  const categories = Array.from(categoryMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { products, brands, categories };
}

export async function fetchPromotionWithAssociations(id: string) {
  const supabase = createServiceClient();

  const [{ data: promo }, { data: promoProducts }, { data: promoBrands }] = await Promise.all([
    supabase
      .from("promotions")
      .select("id, type, title, subtitle, is_active, max_items, selection_mode, config")
      .eq("id", id)
      .single(),
    supabase
      .from("promotion_products")
      .select("product_id, display_order")
      .eq("promotion_id", id)
      .order("display_order"),
    supabase.from("promotion_brands").select("brand_id").eq("promotion_id", id),
  ]);

  return {
    promo,
    productIds: (promoProducts ?? [])
      .map((r) => r.product_id)
      .filter((id): id is string => id !== null),
    brandIds: (promoBrands ?? []).map((r) => r.brand_id).filter((id): id is string => id !== null),
  };
}
