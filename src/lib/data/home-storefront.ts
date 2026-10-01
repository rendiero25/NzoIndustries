import "server-only";

import { cache } from "react";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import { getFlashSaleLink, getPromoLink } from "@/lib/promo-links";
import type {
  HomeSection,
  HomeSectionKey,
} from "@/app/admin/(panel)/promotions/home-sections/_actions";
import { flashSaleBannerTemplate } from "@/app/admin/(panel)/promotions/flash-sale/_lib/flash-sale-banner-template";
import type { Database } from "@/types/legacy-supabase";

type BannerRow = Pick<
  Database["public"]["Tables"]["banners"]["Row"],
  | "id"
  | "title"
  | "subtitle"
  | "image_url"
  | "link_url"
  | "sort_order"
  | "is_active"
  | "starts_at"
  | "ends_at"
>;

const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  { key: "main_banner", selected_id: null, is_active: true, order: 1 },
  { key: "flash_sale", selected_id: null, is_active: true, order: 2 },
  { key: "second_products", selected_id: null, is_active: true, order: 3 },
  { key: "featured_products", selected_id: null, is_active: true, order: 4 },
  { key: "promo_5", selected_id: null, is_active: false, order: 5 },
  { key: "promo_6", selected_id: null, is_active: false, order: 6 },
  { key: "promo_7", selected_id: null, is_active: false, order: 7 },
  { key: "promo_8", selected_id: null, is_active: false, order: 8 },
];

const GENERIC_SECTION_KEYS = new Set<HomeSectionKey>(["promo_5", "promo_6", "promo_7", "promo_8"]);

/**
 * Batas jumlah produk per rak di beranda: 6 item per slide × maksimal 3 slide (digeser via chevron).
 * Halaman "Lihat Semua" (promo/flash sale) tetap tampilkan semua.
 */
const HOME_SHELF_DISPLAY_LIMIT = 18;

function nowMs(): number {
  return Date.now();
}

function isBannerScheduleOpen(b: Pick<BannerRow, "starts_at" | "ends_at">): boolean {
  const t = nowMs();
  if (b.starts_at) {
    const s = new Date(b.starts_at).getTime();
    if (!Number.isNaN(s) && t < s) return false;
  }
  if (b.ends_at) {
    const e = new Date(b.ends_at).getTime();
    if (!Number.isNaN(e) && t > e) return false;
  }
  return true;
}

function parseHomeSections(value: unknown): HomeSection[] {
  const keys = new Set<HomeSectionKey>([
    "main_banner",
    "flash_sale",
    "second_products",
    "featured_products",
    "promo_5",
    "promo_6",
    "promo_7",
    "promo_8",
  ]);
  const parsed: HomeSection[] = [];
  if (Array.isArray(value)) {
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      const key = o.key as HomeSectionKey;
      if (!keys.has(key)) continue;
      parsed.push({
        key,
        selected_id: typeof o.selected_id === "string" ? o.selected_id : null,
        is_active: Boolean(o.is_active),
        order: typeof o.order === "number" ? o.order : parsed.length + 1,
      });
    }
  }
  return DEFAULT_HOME_SECTIONS.map((def) => {
    const saved = parsed.find((s) => s.key === def.key);
    return saved ?? def;
  }).sort((a, b) => a.order - b.order);
}

export type StoreBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
};

export type HomeShelfProduct = {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  eyebrow: string;
  variantName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  currentPrice: number;
  compareAtPrice: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  /** Opsional — hanya diisi oleh alur yang butuh filter kategori/brand/kondisi (mis. halaman detail promosi). */
  categoryName?: string | null;
  brandName?: string | null;
  condition?: "new" | "second" | null;
};

type ProductImageRow = {
  url: string;
  is_primary: boolean | null;
  sort_order: number | null;
  alt_text: string | null;
};
type BrandRel = { name: string } | null;
type CategoryRel = { name: string } | null;

export type ProductQueryRow = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  average_rating: number | null;
  review_count: number | null;
  total_sold: number | null;
  base_price: number;
  sale_price: number | null;
  condition?: string | null;
  brands: BrandRel | BrandRel[];
  categories: CategoryRel | CategoryRel[];
  product_images: ProductImageRow[] | null;
  product_variants:
    { id: string; price: number; name: string | null; is_active: boolean | null }[] | null;
};

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function pickPrimaryImage(
  images: ProductImageRow[] | null | undefined,
): { url: string; alt: string | null } | null {
  if (!images?.length) return null;
  const primary =
    images.find((i) => i.is_primary) ??
    [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
  return primary ? { url: primary.url, alt: primary.alt_text } : null;
}

export function productRowToShelf(p: ProductQueryRow): HomeShelfProduct | null {
  const variants = (p.product_variants ?? []).filter((v) => v.is_active !== false);
  if (variants.length === 0) return null;
  const minVariant = variants.reduce((a, b) => (a.price <= b.price ? a : b));
  const minPrice = minVariant.price;
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  const base = Number(p.base_price);
  const variantBase = minPrice;
  const effectiveBase = Math.max(base, variantBase);
  const hasProductSale = sale != null && sale > 0 && sale < effectiveBase;
  const currentPrice = hasProductSale ? sale : effectiveBase;
  const compareAtPrice = hasProductSale ? effectiveBase : null;

  const brand = firstRel(p.brands);
  const cat = firstRel(p.categories);
  const eyebrowParts = [brand?.name, cat?.name].filter(Boolean);
  const img = pickPrimaryImage(p.product_images ?? null);

  return {
    productId: p.id,
    variantId: minVariant.id,
    name: p.name,
    slug: p.slug,
    eyebrow: eyebrowParts.join(" · ") || "Produk",
    variantName: minVariant.name ?? null,
    imageUrl: img?.url ?? null,
    imageAlt: img?.alt ?? p.name,
    currentPrice,
    compareAtPrice,
    rating: Number(p.average_rating ?? 0),
    reviewCount: p.review_count ?? 0,
    soldCount: p.total_sold ?? 0,
    categoryName: cat?.name ?? null,
    brandName: brand?.name ?? null,
    condition: p.condition === "new" || p.condition === "second" ? p.condition : null,
  };
}

async function fetchProductsByIdsOrdered(ids: string[]): Promise<HomeShelfProduct[]> {
  if (ids.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
       brands:brand_id(name),
       categories:category_id(name),
       product_images(url, is_primary, sort_order, alt_text),
       product_variants(id, price, name, is_active)`,
    )
    .in("id", ids)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (error || !data) return [];
  const rows = data as unknown as ProductQueryRow[];
  const map = new Map(rows.map((r) => [r.id, r]));
  const out: HomeShelfProduct[] = [];
  for (const id of ids) {
    const row = map.get(id);
    if (!row) continue;
    const shelf = productRowToShelf(row);
    if (shelf) out.push(shelf);
  }
  return out;
}

type PromoConfig = { sort_by?: string; category_id?: string };

async function fetchProductsForBrandPromotion(
  brandIds: string[],
  maxItems: number,
  config: PromoConfig | null,
  type: "second_products" | "featured_products",
): Promise<HomeShelfProduct[]> {
  if (brandIds.length === 0 || maxItems <= 0) return [];
  const supabase = createServiceClient();
  let q = supabase
    .from("products")
    .select(
      `id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
       brands:brand_id(name),
       categories:category_id(name),
       product_images(url, is_primary, sort_order, alt_text),
       product_variants(id, price, name, is_active)`,
    )
    .in("brand_id", brandIds)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (config?.category_id) {
    q = q.eq("category_id", config.category_id);
  }
  if (type === "second_products") {
    q = q.eq("condition", "second");
  }

  const { data, error } = await q;
  if (error || !data) return [];
  const rows = data as unknown as ProductQueryRow[];
  const sortBy = config?.sort_by ?? (type === "second_products" ? "rating" : "newest");

  const scored = rows
    .map((r) => ({ r, shelf: productRowToShelf(r) }))
    .filter((x): x is { r: ProductQueryRow; shelf: HomeShelfProduct } => x.shelf != null);

  if (sortBy === "price_asc") {
    scored.sort((a, b) => a.shelf.currentPrice - b.shelf.currentPrice);
  } else if (sortBy === "price_desc") {
    scored.sort((a, b) => b.shelf.currentPrice - a.shelf.currentPrice);
  } else if (sortBy === "bestseller") {
    scored.sort((a, b) => (b.r.total_sold ?? 0) - (a.r.total_sold ?? 0));
  } else if (sortBy === "rating") {
    scored.sort((a, b) => {
      const ra = Number(a.r.average_rating ?? 0);
      const rb = Number(b.r.average_rating ?? 0);
      if (rb !== ra) return rb - ra;
      return (b.r.total_sold ?? 0) - (a.r.total_sold ?? 0);
    });
  } else {
    scored.sort((a, b) => {
      const ta = new Date(a.r.created_at ?? 0).getTime();
      const tb = new Date(b.r.created_at ?? 0).getTime();
      return tb - ta;
    });
  }

  return scored.slice(0, maxItems).map((s) => s.shelf);
}

export async function resolvePromotionShelfProducts(
  promotionId: string,
  type: "second_products" | "featured_products",
): Promise<HomeShelfProduct[]> {
  const supabase = createServiceClient();
  const [{ data: promo }, { data: pp }, { data: pb }] = await Promise.all([
    supabase
      .from("promotions")
      .select("id, is_active, max_items, selection_mode, config")
      .eq("id", promotionId)
      .single(),
    supabase
      .from("promotion_products")
      .select("product_id, display_order")
      .eq("promotion_id", promotionId),
    supabase.from("promotion_brands").select("brand_id").eq("promotion_id", promotionId),
  ]);

  if (!promo || promo.is_active !== true) return [];
  const maxItems = promo.max_items ?? 12;
  const mode = (promo.selection_mode ?? "manual") as "manual" | "brand";
  const config = (promo.config ?? null) as PromoConfig | null;

  if (mode === "manual") {
    const orderedIds = (pp ?? [])
      .filter((r) => r.product_id)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((r) => r.product_id as string);
    const sliced = orderedIds.slice(0, maxItems);
    return fetchProductsByIdsOrdered(sliced);
  }

  const brandIds = (pb ?? []).map((r) => r.brand_id).filter((id): id is string => id != null);
  return fetchProductsForBrandPromotion(brandIds, maxItems, config, type);
}

function mapBanners(rows: BannerRow[] | null): StoreBanner[] {
  return (rows ?? [])
    .filter((b) => b.is_active && isBannerScheduleOpen(b))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      image_url: b.image_url,
      link_url: b.link_url,
    }));
}

export async function fetchMainHeroBanners(): Promise<StoreBanner[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("banners")
      .select("id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at")
      .eq("template", "main_banner")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return mapBanners(data as BannerRow[]);
  } catch {
    return [];
  }
}

export const fetchTemplateBanners = cache(async (template: string): Promise<StoreBanner[]> => {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("banners")
      .select("id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at")
      .eq("template", template)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return mapBanners(data as BannerRow[]);
  } catch {
    return [];
  }
});

export type FlashSaleBlockData = {
  saleId: string;
  saleName: string;
  /** Subtitle dari tabel `flash_sales` (admin flash sale) */
  subtitle: string | null;
  endsAt: string | null;
  products: HomeShelfProduct[];
};

async function fetchFlashSaleByExactName(
  name: string,
): Promise<{ id: string; name: string; subtitle: string | null; endsAt: string | null } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, ends_at")
    .eq("is_active", true)
    .eq("name", name)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    subtitle: data.subtitle ?? null,
    endsAt: data.ends_at ?? null,
  };
}

/** Urutan nama yang dicoba agar cocok dengan DB (mis. dengan / tanpa `!`). */
function flashSaleCampaignNameCandidates(primary: string): string[] {
  const t = primary.trim();
  const out: string[] = [];
  const push = (s: string) => {
    if (s.length === 0 || out.includes(s)) return;
    out.push(s);
  };
  push(t);
  if (!t.endsWith("!")) push(`${t}!`);
  if (t.endsWith("!")) {
    const noBang = t.slice(0, -1).trimEnd();
    push(noBang);
  }
  return out;
}

function flashRowToShelf(row: {
  variant_id: string;
  sale_price: number;
  sold: number;
  product_variants: {
    id: string;
    price: number;
    name: string;
    products: {
      id: string;
      name: string;
      slug: string;
      average_rating: number | null;
      review_count: number | null;
      total_sold: number | null;
      brands: BrandRel | BrandRel[];
      categories: CategoryRel | CategoryRel[];
      product_images: ProductImageRow[] | null;
    } | null;
  } | null;
}): HomeShelfProduct | null {
  const pv = row.product_variants;
  const pr = pv?.products;
  if (!pv || !pr) return null;
  const brand = firstRel(pr.brands);
  const cat = firstRel(pr.categories);
  const eyebrowParts = [brand?.name, cat?.name].filter(Boolean);
  const img = pickPrimaryImage(pr.product_images ?? null);
  const base = Number(pv.price);
  const sale = Number(row.sale_price);
  return {
    productId: pr.id,
    variantId: row.variant_id,
    name: pr.name,
    slug: pr.slug,
    eyebrow: eyebrowParts.join(" · ") || "Flash sale",
    variantName: pv.name ?? null,
    imageUrl: img?.url ?? null,
    imageAlt: img?.alt ?? pr.name,
    currentPrice: sale,
    compareAtPrice: base > sale ? base : null,
    rating: Number(pr.average_rating ?? 0),
    reviewCount: pr.review_count ?? 0,
    soldCount: row.sold ?? 0,
  };
}

async function loadFlashSaleShelfProductsForSaleId(saleId: string): Promise<HomeShelfProduct[]> {
  const supabase = createServiceClient();
  const { data: fsp } = await supabase
    .from("flash_sale_products")
    .select(
      `variant_id, sale_price, sold,
         product_variants:variant_id (
           id, price, name,
           products:product_id (
             id, name, slug, average_rating, review_count, total_sold,
             brands:brand_id(name),
             categories:category_id(name),
             product_images(url, is_primary, sort_order, alt_text)
           )
         )`,
    )
    .eq("flash_sale_id", saleId);

  const products: HomeShelfProduct[] = [];
  for (const row of fsp ?? []) {
    const shelf = flashRowToShelf(row as Parameters<typeof flashRowToShelf>[0]);
    if (shelf) products.push(shelf);
  }
  return products.slice(0, HOME_SHELF_DISPLAY_LIMIT);
}

/** Flash sale aktif pertama (urut `starts_at`) yang punya minimal satu produk siap tampil di rak. */
async function fetchFirstActiveFlashSaleBlockWithProducts(): Promise<FlashSaleBlockData | null> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data: sales, error } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, ends_at")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false });
  if (error || !sales?.length) return null;

  const results = await Promise.all(
    sales.map(async (row) => ({
      row,
      products: await loadFlashSaleShelfProductsForSaleId(row.id),
    })),
  );

  const first = results.find((r) => r.products.length > 0);
  if (!first) return null;
  return {
    saleId: first.row.id,
    saleName: first.row.name,
    subtitle: first.row.subtitle ?? null,
    endsAt: first.row.ends_at ?? null,
    products: first.products,
  };
}

async function fetchFlashSaleBlockBySaleId(saleId: string): Promise<FlashSaleBlockData | null> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data: sale, error } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, ends_at")
    .eq("id", saleId)
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .maybeSingle();
  if (error || !sale) return null;
  const products = await loadFlashSaleShelfProductsForSaleId(sale.id);
  return {
    saleId: sale.id,
    saleName: sale.name,
    subtitle: sale.subtitle ?? null,
    endsAt: sale.ends_at ?? null,
    products,
  };
}

/**
 * Rak flash sale utama beranda: `selected_id` section **flash_sale** di `settings.home_sections`,
 * lalu fallback ke flash sale aktif pertama yang punya produk.
 */
export async function fetchPrimaryHomeFlashSaleBlock(): Promise<FlashSaleBlockData | null> {
  try {
    const supabase = createServiceClient();
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "home_sections")
      .maybeSingle();
    const sections = parseHomeSections(settingsRow?.value);
    const flashSection = sections.find((s) => s.key === "flash_sale" && s.is_active);
    if (flashSection?.selected_id) {
      const configured = await fetchFlashSaleBlockBySaleId(flashSection.selected_id);
      if (configured) return configured;
    }
    return await fetchFirstActiveFlashSaleBlockWithProducts();
  } catch {
    return null;
  }
}

/**
 * Rak flash sale berdasarkan nama kampanye (beberapa varian nama dicoba), lalu fallback ke kampanye aktif lain yang punya produk.
 */
export async function fetchFlashSaleBlockByCampaignName(
  name: string,
): Promise<FlashSaleBlockData | null> {
  try {
    const candidates = flashSaleCampaignNameCandidates(name);
    const saleResults = await Promise.all(candidates.map((c) => fetchFlashSaleByExactName(c)));
    const sale = saleResults.find((s) => s !== null) ?? null;
    if (sale) {
      const products = await loadFlashSaleShelfProductsForSaleId(sale.id);
      return {
        saleId: sale.id,
        saleName: sale.name,
        subtitle: sale.subtitle,
        endsAt: sale.endsAt,
        products,
      };
    }
    return await fetchFirstActiveFlashSaleBlockWithProducts();
  } catch {
    return null;
  }
}

export type ShopBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
};

export async function fetchShopBrands(): Promise<ShopBrand[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error || !data) return [];
    return data as ShopBrand[];
  } catch {
    return [];
  }
}

export type DynamicPromoBlock = {
  sectionKey: HomeSectionKey;
  title: string;
  subtitle: string | null;
  banners: StoreBanner[];
  products: HomeShelfProduct[];
  linkUrl: string | null;
};

/** Rak "Produk Terbaru" — selalu tampil di beranda, lepas dari section promo lain. */
export async function fetchLatestHomeProducts(limit: number): Promise<HomeShelfProduct[]> {
  if (limit <= 0) return [];
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        `id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price,
         brands:brand_id(name),
         categories:category_id(name),
         product_images(url, is_primary, sort_order, alt_text),
         product_variants(id, price, name, is_active)`,
      )
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(48, limit * 4));

    if (error || !data) return [];
    const rows = data as unknown as ProductQueryRow[];
    const out: HomeShelfProduct[] = [];
    for (const row of rows) {
      const shelf = productRowToShelf(row);
      if (shelf) out.push(shelf);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchFlashSaleStorefrontById(saleId: string): Promise<{
  saleName: string;
  subtitle: string | null;
  banners: StoreBanner[];
  products: HomeShelfProduct[];
} | null> {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();
    const { data: sale, error: saleErr } = await supabase
      .from("flash_sales")
      .select("id, name, subtitle")
      .eq("id", saleId)
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .single();
    if (saleErr || !sale) return null;

    const template = flashSaleBannerTemplate(sale.id);
    const [{ data: bannerRows }, { data: fsp }] = await Promise.all([
      supabase
        .from("banners")
        .select(
          "id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at",
        )
        .eq("template", template)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("flash_sale_products")
        .select(
          `variant_id, sale_price, sold,
           product_variants:variant_id (
             id, price, name,
             products:product_id (
               id, name, slug, average_rating, review_count, total_sold,
               brands:brand_id(name),
               categories:category_id(name),
               product_images(url, is_primary, sort_order, alt_text)
             )
           )`,
        )
        .eq("flash_sale_id", sale.id),
    ]);

    const products: HomeShelfProduct[] = [];
    for (const row of fsp ?? []) {
      const shelf = flashRowToShelf(row as Parameters<typeof flashRowToShelf>[0]);
      if (shelf) products.push(shelf);
    }

    return {
      saleName: sale.name,
      subtitle: sale.subtitle ?? null,
      banners: mapBanners(bannerRows as BannerRow[]),
      products: products.slice(0, HOME_SHELF_DISPLAY_LIMIT),
    };
  } catch {
    return null;
  }
}

export type FetchDynamicHomePromoBlocksOptions = {
  /** Flash sale yang sudah ditampilkan di blok lain (mis. `HomeFlashSaleBlock`) — hindari duplikat */
  excludeFlashSaleIds?: string[];
};

type ServiceSupabase = ReturnType<typeof createServiceClient>;

async function pickFirstFlashSaleIdWithContent(
  supabase: ServiceSupabase,
  exclude: Set<string>,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { data: sales } = await supabase
    .from("flash_sales")
    .select("id")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false });
  const candidates = (sales ?? []).filter((r) => !exclude.has(r.id));
  if (candidates.length === 0) return null;
  const results = await Promise.all(
    candidates.map(async (row) => ({
      id: row.id,
      storefront: await fetchFlashSaleStorefrontById(row.id),
    })),
  );
  const first = results.find(
    (r) =>
      r.storefront !== null &&
      (r.storefront.banners.length > 0 || r.storefront.products.length > 0),
  );
  return first?.id ?? null;
}

async function pickFirstPromotionIdWithContent(
  supabase: ServiceSupabase,
  type: "second_products" | "featured_products",
): Promise<string | null> {
  const { data: promos } = await supabase
    .from("promotions")
    .select("id")
    .eq("is_active", true)
    .eq("type", type)
    .order("created_at", { ascending: false });
  for (const row of promos ?? []) {
    const [banners, products] = await Promise.all([
      fetchTemplateBanners(type),
      resolvePromotionShelfProducts(row.id, type),
    ]);
    if (banners.length > 0 || products.length > 0) return row.id;
  }
  return null;
}

export async function fetchDynamicHomePromoBlocks(
  options?: FetchDynamicHomePromoBlocksOptions,
): Promise<DynamicPromoBlock[]> {
  try {
    const supabase = createServiceClient();
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "home_sections")
      .maybeSingle();
    const sections = parseHomeSections(settingsRow?.value);
    const excludeFlash = new Set(options?.excludeFlashSaleIds ?? []);

    const results = await Promise.all(
      sections.map(async (s): Promise<DynamicPromoBlock | null> => {
        if (!s.is_active) return null;

        // main_banner and flash_sale are rendered by dedicated components above brands
        if (s.key === "main_banner" || s.key === "flash_sale") return null;

        if (s.key === "second_products" || s.key === "featured_products") {
          let promoId = s.selected_id;
          if (!promoId) {
            promoId = await pickFirstPromotionIdWithContent(supabase, s.key);
          }
          if (!promoId) return null;

          const { data: promo } = await supabase
            .from("promotions")
            .select("id, type, title, subtitle, is_active")
            .eq("id", promoId)
            .single();

          if (!promo || promo.is_active !== true || promo.type !== s.key) return null;

          const [banners, products] = await Promise.all([
            fetchTemplateBanners(s.key),
            resolvePromotionShelfProducts(promo.id, s.key),
          ]);

          if (banners.length === 0 && products.length === 0) return null;

          const linkUrl = getPromoLink(promo.id);
          return {
            sectionKey: s.key,
            title: promo.title,
            subtitle: promo.subtitle,
            banners: banners.map((b) => ({ ...b, link_url: b.link_url ?? linkUrl })),
            products: products.slice(0, HOME_SHELF_DISPLAY_LIMIT),
            linkUrl,
          };
        }

        // Generic slots promo_5…promo_8: auto-detect type from selected_id
        if (GENERIC_SECTION_KEYS.has(s.key)) {
          if (!s.selected_id) return null; // no auto-fallback for generic slots

          // Try flash sale first
          const flashData = await fetchFlashSaleStorefrontById(s.selected_id);
          if (flashData) {
            if (flashData.banners.length === 0 && flashData.products.length === 0) return null;
            const linkUrl = getFlashSaleLink(s.selected_id);
            return {
              sectionKey: s.key,
              title: flashData.saleName,
              subtitle: flashData.subtitle,
              banners: flashData.banners.map((b) => ({ ...b, link_url: b.link_url ?? linkUrl })),
              products: flashData.products,
              linkUrl,
            };
          }

          // Try promotion (second_products or featured_products)
          const { data: promo } = await supabase
            .from("promotions")
            .select("id, type, title, subtitle, is_active")
            .eq("id", s.selected_id)
            .maybeSingle();

          if (!promo || promo.is_active !== true) return null;
          const promoType = promo.type as "second_products" | "featured_products";
          if (promoType !== "second_products" && promoType !== "featured_products") return null;

          const [banners, products] = await Promise.all([
            fetchTemplateBanners(promoType),
            resolvePromotionShelfProducts(promo.id, promoType),
          ]);

          if (banners.length === 0 && products.length === 0) return null;

          const linkUrl = getPromoLink(promo.id);
          return {
            sectionKey: s.key,
            title: promo.title,
            subtitle: promo.subtitle ?? null,
            banners: banners.map((b) => ({ ...b, link_url: b.link_url ?? linkUrl })),
            products: products.slice(0, HOME_SHELF_DISPLAY_LIMIT),
            linkUrl,
          };
        }

        return null;
      }),
    );

    const blocks = results.filter((b): b is DynamicPromoBlock => b !== null);

    return blocks;
  } catch {
    return [];
  }
}
