import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Data produk panel admin (staf membaca semua status lewat RLS). */
export const ADMIN_PRODUCTS_PER_PAGE = 25;

export type AdminProductFilters = {
  q?: string;
  status?: string;
  brand?: string;
  category?: string;
  stock?: string; // "out" | "low"
  photo?: string; // "none"
  page?: number;
};

export type AdminProductRow = {
  id: string;
  name: string;
  sku: string;
  status: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  brand: string | null;
  imagePublicId: string | null;
  variantCount: number;
  updatedAt: string;
};

export async function listAdminProducts(
  f: AdminProductFilters,
  lowThreshold: number,
): Promise<{ total: number; page: number; rows: AdminProductRow[] }> {
  const supabase = await createClient();
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const categoryJoin = f.category
    ? "product_categories!inner(category_id)"
    : "product_categories(category_id)";
  const photoJoin =
    f.photo === "none"
      ? "product_images!left(public_id, sort_order)"
      : "product_images(public_id, sort_order)";
  let query = supabase
    .from("products")
    .select(
      `id, name, sku, status, price, compare_at_price, stock, updated_at, brand:brands(name), ${photoJoin}, product_variants(id), ${categoryJoin}`,
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * ADMIN_PRODUCTS_PER_PAGE, page * ADMIN_PRODUCTS_PER_PAGE - 1);

  const q = f.q?.trim();
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").slice(0, 80);
    query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,source_sku.ilike.%${safe}%`);
  }
  if (f.status && ["draft", "published", "archived"].includes(f.status))
    query = query.eq("status", f.status as never);
  if (f.brand && /^[0-9a-f-]{36}$/.test(f.brand)) query = query.eq("brand_id", f.brand);
  if (f.category && /^[0-9a-f-]{36}$/.test(f.category))
    query = query.eq("product_categories.category_id", f.category);
  if (f.stock === "out") query = query.lte("stock", 0);
  if (f.stock === "low") query = query.gt("stock", 0).lte("stock", lowThreshold);
  if (f.photo === "none") query = query.is("product_images", null);

  const { data, count } = await query;
  return {
    page,
    total: count ?? 0,
    rows: (data ?? []).map((p) => {
      const images = (p.product_images ?? []) as { public_id: string; sort_order: number }[];
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        status: p.status,
        price: Number(p.price),
        compareAtPrice: p.compare_at_price === null ? null : Number(p.compare_at_price),
        stock: p.stock,
        brand: p.brand?.name ?? null,
        imagePublicId:
          [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.public_id ?? null,
        variantCount: (p.product_variants ?? []).length,
        updatedAt: p.updated_at,
      };
    }),
  };
}

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  sourceSku: string | null;
  status: "draft" | "published" | "archived";
  brandId: string | null;
  categoryIds: string[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
  shortDescription: string | null;
  description: string | null;
  installationGuide: string | null;
  warrantyInfo: string | null;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  importLocked: boolean;
  totalSold: number;
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number | null;
    compareAtPrice: number | null;
    stock: number;
    weightGrams: number | null;
    isActive: boolean;
  }[];
  specs: { label: string; value: string }[];
  fitments: {
    id: string;
    modelId: string;
    label: string;
    yearStart: number | null;
    yearEnd: number | null;
    notes: string | null;
    isVerified: boolean;
    source: string;
  }[];
  imageCount: number;
};

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select(
      "*, product_categories(category_id), product_variants(id, name, sku, price, compare_at_price, stock, weight_grams, is_active, sort_order), product_specs(label, value, sort_order), product_fitments(id, model_id, year_start, year_end, notes, is_verified, source, model:vehicle_models(name, make:vehicle_makes(name))), product_images(id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    sourceSku: p.source_sku,
    status: p.status,
    brandId: p.brand_id,
    categoryIds: (p.product_categories ?? []).map((c) => c.category_id),
    price: Number(p.price),
    compareAtPrice: p.compare_at_price === null ? null : Number(p.compare_at_price),
    stock: p.stock,
    shortDescription: p.short_description,
    description: p.description,
    installationGuide: p.installation_guide,
    warrantyInfo: p.warranty_info,
    weightGrams: p.weight_grams,
    lengthMm: p.length_mm,
    widthMm: p.width_mm,
    heightMm: p.height_mm,
    metaTitle: p.meta_title,
    metaDescription: p.meta_description,
    importLocked: p.import_locked,
    totalSold: p.total_sold,
    variants: [...(p.product_variants ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price === null ? null : Number(v.price),
        compareAtPrice: v.compare_at_price === null ? null : Number(v.compare_at_price),
        stock: v.stock,
        weightGrams: v.weight_grams,
        isActive: v.is_active,
      })),
    specs: [...(p.product_specs ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ label: s.label, value: s.value })),
    fitments: (p.product_fitments ?? [])
      .map((f) => ({
        id: f.id,
        modelId: f.model_id,
        label: `${f.model?.make?.name ?? ""} ${f.model?.name ?? ""}`.trim(),
        yearStart: f.year_start,
        yearEnd: f.year_end,
        notes: f.notes,
        isVerified: f.is_verified,
        source: f.source,
      }))
      .sort(
        (a, b) => Number(a.isVerified) - Number(b.isVerified) || a.label.localeCompare(b.label),
      ),
    imageCount: (p.product_images ?? []).length,
  };
}

/** Pilihan form: brand & kategori (semua, termasuk nonaktif) untuk staf. */
export async function getProductFormOptions(): Promise<{
  brands: { id: string; name: string }[];
  categories: { id: string; name: string; depth: number }[];
}> {
  const supabase = await createClient();
  const [{ data: brands }, { data: cats }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase
      .from("categories")
      .select("id, name, parent_id, sort_order")
      .order("sort_order")
      .order("name"),
  ]);
  const all = cats ?? [];
  const out: { id: string; name: string; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of all.filter((x) => x.parent_id === parent)) {
      out.push({ id: c.id, name: c.name, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return { brands: brands ?? [], categories: out };
}

export async function getLowStockThreshold(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("low_stock_threshold")
    .eq("id", true)
    .maybeSingle();
  return data?.low_stock_threshold ?? 5;
}
