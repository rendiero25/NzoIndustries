/**
 * Filter katalog di URL (PLP). Satu sumber untuk halaman server (parse) dan
 * komponen filter client (serialize), supaya URL selalu kanonis.
 *   ?q=&b=brand-a,brand-b&min=&max=&stock=1&rating=4&sale=1&fit=1&sort=&page=
 * `fit=1` = batasi ke kendaraan aktif di Garasi (cookie).
 */
export const CATALOG_SORTS = [
  "relevance",
  "newest",
  "bestseller",
  "price_asc",
  "price_desc",
  "rating",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const SORT_LABEL: Record<CatalogSort, string> = {
  relevance: "Paling sesuai",
  newest: "Terbaru",
  bestseller: "Terlaris",
  price_asc: "Harga terendah",
  price_desc: "Harga tertinggi",
  rating: "Rating tertinggi",
};

export const PAGE_SIZE = 24;
const MAX_PAGE = 500;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CatalogParams = {
  q: string | null;
  brands: string[];
  min: number | null;
  max: number | null;
  inStock: boolean;
  rating: number | null;
  onSale: boolean;
  fit: boolean;
  sort: CatalogSort;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function toInt(
  v: string | undefined,
  { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
): number | null {
  if (!v || !/^\d{1,12}$/.test(v)) return null;
  const n = Number(v);
  return n >= min && n <= max ? n : null;
}

export function parseCatalogParams(sp: RawSearchParams): CatalogParams {
  const q = first(sp.q)?.replace(/\s+/g, " ").trim().slice(0, 100) || null;
  const brands = [
    ...new Set(
      (first(sp.b) ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => SLUG.test(s) && s.length <= 80),
    ),
  ]
    .slice(0, 20)
    .sort();
  let min = toInt(first(sp.min));
  let max = toInt(first(sp.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const rating = toInt(first(sp.rating), { min: 1, max: 5 });
  const sortRaw = first(sp.sort);
  const sort = (CATALOG_SORTS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as CatalogSort)
    : q
      ? "relevance"
      : "bestseller";
  const page = toInt(first(sp.page), { min: 1, max: MAX_PAGE }) ?? 1;
  return {
    q,
    brands,
    min,
    max,
    inStock: first(sp.stock) === "1",
    rating,
    onSale: first(sp.sale) === "1",
    fit: first(sp.fit) === "1",
    sort,
    page,
  };
}

/** Kembali ke query string kanonis; nilai default tidak ditulis. */
export function serializeCatalogParams(p: Partial<CatalogParams>): string {
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  if (p.brands?.length) out.set("b", [...p.brands].sort().join(","));
  if (p.min != null) out.set("min", String(p.min));
  if (p.max != null) out.set("max", String(p.max));
  if (p.inStock) out.set("stock", "1");
  if (p.rating != null) out.set("rating", String(p.rating));
  if (p.onSale) out.set("sale", "1");
  if (p.fit) out.set("fit", "1");
  const defaultSort = p.q ? "relevance" : "bestseller";
  if (p.sort && p.sort !== defaultSort) out.set("sort", p.sort);
  if (p.page && p.page > 1) out.set("page", String(p.page));
  const s = out.toString();
  return s ? `?${s}` : "";
}

/** Jumlah filter aktif (badge tombol filter mobile). Urutan & halaman tidak dihitung. */
export function countActiveFilters(p: CatalogParams): number {
  return (
    (p.brands.length ? 1 : 0) +
    (p.min != null || p.max != null ? 1 : 0) +
    (p.inStock ? 1 : 0) +
    (p.rating != null ? 1 : 0) +
    (p.onSale ? 1 : 0) +
    (p.fit ? 1 : 0)
  );
}
