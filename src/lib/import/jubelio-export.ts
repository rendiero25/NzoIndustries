/**
 * Export "Daftar Harga" Jubelio (XLS) → staging rows.
 * Format: baris judul, lalu header `NAMA BARANG | SKU | | VARIANT | FOTO | | |
 * Harga Default | <kolom marketplace…>`. Baris dengan nama kosong = varian
 * dari produk di atasnya. D-22: harga web = Harga Default.
 */
import { detectBrand } from "./brands.ts";
import { suggestCategory } from "./categories.ts";
import { cleanProductName, tidyLabel } from "./clean-name.ts";
import { createSkuAllocator, parentSkuFor } from "./normalize-sku.ts";
import { productSlug } from "./slug.ts";
import type {
  ImportSummary,
  MappedProduct,
  MappedSpec,
  MappedVariant,
  StagedRow,
} from "./types.ts";
import { suggestFitments } from "./vehicles.ts";

export type SheetCell = string | number | boolean | Date | null | undefined;
export type SheetRow = SheetCell[];

export type JubelioExportRow = {
  sku: string;
  variant: string | null;
  price: number | null;
  marketplacePrices: Record<string, number>;
};

export type JubelioExportGroup = {
  rowIndex: number;
  name: string;
  rows: JubelioExportRow[];
};

export class ImportFormatError extends Error {}

const text = (v: SheetCell): string =>
  v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim();

function toPrice(v: SheetCell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const s = text(v).replace(/[^\d,.-]/g, "");
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function parseJubelioExport(rows: SheetRow[]): JubelioExportGroup[] {
  const headerAt = rows.slice(0, 15).findIndex((r) => text(r[0]).toUpperCase() === "NAMA BARANG");
  if (headerAt < 0) {
    throw new ImportFormatError(
      "Header 'NAMA BARANG' tidak ditemukan. Pastikan file adalah export Daftar Harga Jubelio.",
    );
  }
  const header = rows[headerAt]!.map((h) => text(h));
  const col = (name: string) => header.findIndex((h) => h.toUpperCase() === name);
  const iName = col("NAMA BARANG");
  const iSku = col("SKU");
  const iVariant = col("VARIANT");
  const iPrice = col("HARGA DEFAULT");
  if (iSku < 0 || iPrice < 0) {
    throw new ImportFormatError(
      "Kolom 'SKU' atau 'Harga Default' tidak ditemukan di export Jubelio.",
    );
  }
  const marketplaceCols = header.map((h, i) => ({ h, i })).filter(({ h, i }) => h && i > iPrice);

  const groups: JubelioExportGroup[] = [];
  for (let r = headerAt + 1; r < rows.length; r++) {
    const row = rows[r]!;
    const sku = text(row[iSku]);
    const name = text(row[iName]);
    if (!sku && !name) continue;
    const entry: JubelioExportRow = {
      sku,
      variant: iVariant >= 0 ? text(row[iVariant]) || null : null,
      price: toPrice(row[iPrice]),
      marketplacePrices: Object.fromEntries(
        marketplaceCols.flatMap(({ h, i }) => {
          const p = toPrice(row[i]);
          return p === null ? [] : [[h, p]];
        }),
      ),
    };
    if (name || groups.length === 0) {
      groups.push({ rowIndex: r + 1, name, rows: [entry] });
    } else {
      groups[groups.length - 1]!.rows.push(entry);
    }
  }
  return groups;
}

/** Pembeda varian tanpa label, dari sisa SKU setelah prefix induk. */
function variantLabelFromSku(rawSku: string, parent: string): string {
  const inParens = rawSku.match(/\(([^)]+)\)\s*$/);
  if (inParens) return inParens[1]!.trim();
  const rest = rawSku.toUpperCase().startsWith(parent.toUpperCase())
    ? rawSku.slice(parent.length)
    : rawSku;
  return rest.replace(/^[\s._-]+/, "").trim() || rawSku;
}

export function mapJubelioGroups(groups: JubelioExportGroup[]): {
  rows: StagedRow[];
  summary: ImportSummary;
} {
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

  for (const g of groups) {
    const warnings: string[] = [];
    const raw = { name: g.name, rows: g.rows };
    const fail = (sku: string, error: string) => {
      staged.push({
        row_index: g.rowIndex,
        sku,
        raw,
        mapped: null,
        status: "invalid",
        error,
        warnings,
      });
      summary.invalid += 1;
    };

    summary.products += 1;
    if (!g.name) {
      fail(g.rows[0]?.sku ?? "", "Nama barang kosong");
      continue;
    }
    const badPrice = g.rows.find((r) => r.price === null || r.price <= 0);
    if (badPrice) {
      fail(badPrice.sku, `Harga Default tidak valid untuk SKU "${badPrice.sku}"`);
      continue;
    }

    const allocated: { raw: JubelioExportRow; sku: string }[] = [];
    let skuError: string | null = null;
    for (const r of g.rows) {
      const a = allocator.allocate(r.sku);
      if (!a) {
        skuError = `SKU "${r.sku}" tidak bisa dinormalisasi`;
        break;
      }
      if (a.changed) {
        summary.normalizedSkus += 1;
        warnings.push(`SKU dinormalisasi: "${r.sku}" → "${a.sku}"`);
      }
      if (a.collided) warnings.push(`SKU "${r.sku}" bentrok setelah normalisasi, diberi akhiran`);
      allocated.push({ raw: r, sku: a.sku });
    }
    if (skuError) {
      fail(g.rows[0]?.sku ?? "", skuError);
      continue;
    }

    const first = allocated[0]!;
    const { name, partNumbers } = cleanProductName(g.name, { sku: first.raw.sku });
    const specs: MappedSpec[] = [];
    if (partNumbers.length)
      specs.push({ label: "Nomor part", value: partNumbers.join(", "), sort_order: 1 });

    let sku: string;
    let sourceSku: string | null;
    let price: number;
    let variants: MappedVariant[] = [];

    if (allocated.length === 1) {
      sku = first.sku;
      sourceSku = first.raw.sku;
      price = first.raw.price!;
      if (first.raw.variant)
        specs.push({ label: "Varian", value: first.raw.variant, sort_order: 2 });
    } else {
      const parentBase = parentSkuFor(allocated.map((a) => a.sku));
      const parent = allocator.allocate(parentBase);
      if (!parent) {
        fail(first.raw.sku, "SKU induk varian tidak valid");
        continue;
      }
      sku = parent.sku;
      sourceSku = null;
      price = Math.min(...allocated.map((a) => a.raw.price!));
      const usedNames = new Set<string>();
      variants = allocated.map((a, i) => {
        let vName = tidyLabel(a.raw.variant ?? variantLabelFromSku(a.raw.sku, parentBase));
        if (usedNames.has(vName.toUpperCase())) vName = `${vName} (${a.sku})`;
        usedNames.add(vName.toUpperCase());
        return {
          sku: a.sku,
          source_sku: a.raw.sku,
          name: vName,
          options: { varian: vName },
          price: a.raw.price === price ? null : a.raw.price,
          compare_at_price: null,
          weight_grams: null,
          stock: null,
          sort_order: i + 1,
        };
      });
      summary.variants += variants.length;
    }

    const brand = detectBrand(g.name);
    const mapped: MappedProduct = {
      name: name || g.name.slice(0, 90),
      slug: productSlug(name || g.name, sku),
      sku,
      source_sku: sourceSku,
      search_keywords: g.name,
      price,
      compare_at_price: null,
      weight_grams: null,
      stock: null,
      brand_name: brand?.name ?? null,
      brand_slug: brand?.slug ?? null,
      category_slugs: [suggestCategory(g.name)],
      specs,
      variants,
      fitment_suggestions: suggestFitments(g.name),
    };
    staged.push({
      row_index: g.rowIndex,
      sku,
      raw,
      mapped,
      status: "valid",
      error: null,
      warnings,
    });
    summary.valid += 1;
    summary.warnings += warnings.length;
  }

  return { rows: staged, summary };
}
