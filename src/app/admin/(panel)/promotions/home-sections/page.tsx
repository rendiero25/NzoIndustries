import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { HomeSectionsEditor } from "./_components/home-sections-editor";
import type { HomeSection } from "./_actions";

export const metadata: Metadata = { title: "Tampilan Beranda — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const DEFAULT_SECTIONS: HomeSection[] = [
  { key: "main_banner", selected_id: null, is_active: true, order: 1 },
  { key: "flash_sale", selected_id: null, is_active: true, order: 2 },
  { key: "second_products", selected_id: null, is_active: true, order: 3 },
  { key: "featured_products", selected_id: null, is_active: true, order: 4 },
  { key: "promo_5", selected_id: null, is_active: false, order: 5 },
  { key: "promo_6", selected_id: null, is_active: false, order: 6 },
  { key: "promo_7", selected_id: null, is_active: false, order: 7 },
  { key: "promo_8", selected_id: null, is_active: false, order: 8 },
];

export default async function HomeSectionsPage() {
  const supabase = createServiceClient();

  // ── Fetch all template data in parallel ──────────────────────────────────
  const [
    { data: rawBanners },
    { data: rawFlashSales },
    { data: rawPromos },
    { data: settingsRow },
  ] = await Promise.all([
    supabase
      .from("banners")
      .select("id, title, is_active, sort_order, created_at")
      .eq("template", "main_banner")
      .order("sort_order", { ascending: true }),
    supabase
      .from("flash_sales")
      .select("id, name, is_active, starts_at, ends_at, created_at")
      .order("starts_at", { ascending: false }),
    supabase
      .from("promotions")
      .select("id, type, title, is_active, max_items, selection_mode, created_at")
      .in("type", ["second_products", "featured_products"])
      .order("created_at", { ascending: false }),
    supabase.from("settings").select("value").eq("key", "home_sections").single(),
  ]);

  // ── Fetch counts ─────────────────────────────────────────────────────────
  const fsIds = (rawFlashSales ?? []).map((f) => f.id);
  const promoIds = (rawPromos ?? []).map((p) => p.id);

  const [{ data: fspRows }, { data: ppRows }, { data: pbRows }] = await Promise.all([
    fsIds.length
      ? supabase.from("flash_sale_products").select("flash_sale_id").in("flash_sale_id", fsIds)
      : Promise.resolve({ data: [] }),
    promoIds.length
      ? supabase.from("promotion_products").select("promotion_id").in("promotion_id", promoIds)
      : Promise.resolve({ data: [] }),
    promoIds.length
      ? supabase.from("promotion_brands").select("promotion_id").in("promotion_id", promoIds)
      : Promise.resolve({ data: [] }),
  ]);

  // ── Build count maps ──────────────────────────────────────────────────────
  const fsCountMap: Record<string, number> = {};
  const ppCountMap: Record<string, number> = {};
  const pbCountMap: Record<string, number> = {};

  for (const r of fspRows ?? []) {
    if (r.flash_sale_id == null) continue;
    fsCountMap[r.flash_sale_id] = (fsCountMap[r.flash_sale_id] ?? 0) + 1;
  }
  for (const r of ppRows ?? []) {
    if (r.promotion_id == null) continue;
    ppCountMap[r.promotion_id] = (ppCountMap[r.promotion_id] ?? 0) + 1;
  }
  for (const r of pbRows ?? []) {
    if (r.promotion_id == null) continue;
    pbCountMap[r.promotion_id] = (pbCountMap[r.promotion_id] ?? 0) + 1;
  }

  // ── Shape data ────────────────────────────────────────────────────────────
  const banners = (rawBanners ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    is_active: b.is_active === true,
    sort_order: b.sort_order ?? 0,
    created_at: b.created_at ?? "",
  }));

  const flashSales = (rawFlashSales ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    is_active: f.is_active === true,
    starts_at: f.starts_at ?? "",
    ends_at: f.ends_at ?? "",
    created_at: f.created_at ?? "",
    product_count: fsCountMap[f.id] ?? 0,
  }));

  const secondPromos = (rawPromos ?? [])
    .filter((p) => p.type === "second_products")
    .map((p) => ({
      id: p.id,
      title: p.title,
      is_active: p.is_active === true,
      max_items: p.max_items ?? 12,
      selection_mode: p.selection_mode as "manual" | "brand",
      created_at: p.created_at ?? "",
      product_count: ppCountMap[p.id] ?? 0,
      brand_count: pbCountMap[p.id] ?? 0,
    }));

  const featuredPromos = (rawPromos ?? [])
    .filter((p) => p.type === "featured_products")
    .map((p) => ({
      id: p.id,
      title: p.title,
      is_active: p.is_active === true,
      max_items: p.max_items ?? 12,
      selection_mode: p.selection_mode as "manual" | "brand",
      created_at: p.created_at ?? "",
      product_count: ppCountMap[p.id] ?? 0,
      brand_count: pbCountMap[p.id] ?? 0,
    }));

  // ── Merge settings with defaults ─────────────────────────────────────────
  const stored = settingsRow?.value as HomeSection[] | null;
  const sections: HomeSection[] = DEFAULT_SECTIONS.map((def) => {
    const saved = stored?.find((s) => s.key === def.key);
    return saved ?? def;
  }).sort((a, b) => a.order - b.order);

  // For generic promo slots (promo_5…promo_8) all promotions + flash sales are needed.
  // We reuse the same arrays already fetched above — no extra queries required.

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Tampilan Beranda</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Pilih konten tiap seksi lalu atur urutan dan visibilitasnya di halaman beranda
        </p>
      </div>

      <HomeSectionsEditor
        banners={banners}
        flashSales={flashSales}
        secondPromos={secondPromos}
        featuredPromos={featuredPromos}
        initialSections={sections}
      />
    </div>
  );
}
