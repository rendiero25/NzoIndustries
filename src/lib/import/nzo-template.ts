/**
 * Template CSV/XLSX NZO untuk update massal (satu baris = satu produk tanpa
 * varian). Upsert by SKU web; produk bervarian diatur dari export Jubelio
 * atau form produk (Fase 8).
 */
import { detectBrand } from "./brands.ts";
import { suggestCategory } from "./categories.ts";
import { ImportFormatError, type SheetCell, type SheetRow } from "./jubelio-export.ts";
import { createSkuAllocator } from "./normalize-sku.ts";
import { productSlug, slugify } from "./slug.ts";
import type { ImportSummary, MappedProduct, StagedRow } from "./types.ts";
import { suggestFitments } from "./vehicles.ts";

export const NZO_TEMPLATE_COLUMNS = [
  "sku",
  "nama",
  "harga",
  "harga_coret",
  "berat_gram",
  "stok",
  "kategori",
  "brand",
] as const;

export const NZO_TEMPLATE_CSV = `${NZO_TEMPLATE_COLUMNS.join(",")}\nCONTOH-SKU-001,Kampas Rem Depan Vario 125,45000,52000,200,10,rem-motor,Aspira\n`;

const text = (v: SheetCell) =>
  v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim();

function toInt(v: SheetCell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const s = text(v).replace(/[^\d-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function isNzoTemplate(rows: SheetRow[]): boolean {
  const header = (rows[0] ?? []).map((h) => text(h).toLowerCase());
  return header.includes("sku") && header.includes("nama") && header.includes("harga");
}

export function mapNzoTemplate(
  rows: SheetRow[],
  knownCategorySlugs: ReadonlySet<string>,
): {
  rows: StagedRow[];
  summary: ImportSummary;
} {
  if (!isNzoTemplate(rows)) {
    throw new ImportFormatError(`Header template tidak dikenali. Kolom wajib: sku, nama, harga.`);
  }
  const header = rows[0]!.map((h) => text(h).toLowerCase());
  const idx = Object.fromEntries(NZO_TEMPLATE_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<
    (typeof NZO_TEMPLATE_COLUMNS)[number],
    number
  >;
  const get = (row: SheetRow, c: (typeof NZO_TEMPLATE_COLUMNS)[number]) =>
    idx[c] >= 0 ? row[idx[c]] : null;

  const allocator = createSkuAllocator();
  const staged: StagedRow[] = [];
  const summary: ImportSummary = {
    products: 0,
    variants: 0,
    valid: 0,
    invalid: 0,
    normalizedSkus: 0,
    warnings: 0,
  };

  rows.slice(1).forEach((row, i) => {
    const rowIndex = i + 2;
    const rawSku = text(get(row, "sku"));
    const name = text(get(row, "nama"));
    if (!rawSku && !name) return;
    summary.products += 1;
    const raw = Object.fromEntries(NZO_TEMPLATE_COLUMNS.map((c) => [c, text(get(row, c)) || null]));
    const warnings: string[] = [];
    const fail = (error: string) => {
      staged.push({
        row_index: rowIndex,
        sku: rawSku,
        raw,
        mapped: null,
        status: "invalid",
        error,
        warnings,
      });
      summary.invalid += 1;
    };

    if (!name) return fail("Nama wajib diisi");
    const price = toInt(get(row, "harga"));
    if (price === null || price <= 0) return fail("Harga wajib angka lebih dari 0");
    const compareAt = toInt(get(row, "harga_coret"));
    if (compareAt !== null && compareAt <= price)
      return fail("Harga coret harus lebih besar dari harga");
    const weight = toInt(get(row, "berat_gram"));
    if (weight !== null && weight <= 0) return fail("Berat harus lebih dari 0");
    const stock = toInt(get(row, "stok"));
    if (stock !== null && stock < 0) return fail("Stok tidak boleh negatif");

    const a = allocator.allocate(rawSku);
    if (!a) return fail(`SKU "${rawSku}" tidak valid`);
    if (a.changed) {
      summary.normalizedSkus += 1;
      warnings.push(`SKU dinormalisasi: "${rawSku}" → "${a.sku}"`);
    }

    const categoryInput = slugify(text(get(row, "kategori")));
    let category = categoryInput && knownCategorySlugs.has(categoryInput) ? categoryInput : null;
    if (categoryInput && !category)
      warnings.push(`Kategori "${categoryInput}" tidak ada, memakai saran otomatis`);
    category ??= suggestCategory(name);

    const brandInput = text(get(row, "brand"));
    const brand = brandInput ? { name: brandInput, slug: slugify(brandInput) } : detectBrand(name);

    const mapped: MappedProduct = {
      name: name.slice(0, 150),
      slug: productSlug(name, a.sku),
      sku: a.sku,
      source_sku: a.changed ? rawSku : null,
      search_keywords: null,
      price,
      compare_at_price: compareAt,
      weight_grams: weight,
      stock,
      brand_name: brand?.name ?? null,
      brand_slug: brand?.slug || null,
      category_slugs: [category],
      specs: [],
      variants: [],
      fitment_suggestions: suggestFitments(name),
    };
    staged.push({
      row_index: rowIndex,
      sku: a.sku,
      raw,
      mapped,
      status: "valid",
      error: null,
      warnings,
    });
    summary.valid += 1;
    summary.warnings += warnings.length;
  });

  return { rows: staged, summary };
}
