import type { Json } from "../../types/database.ts";
import type { StagedRow } from "./types.ts";

/** Baris `import_products` dari hasil mapping (dipakai script dan server action). */
export function toStagingInsert(batchId: string, row: StagedRow) {
  return {
    batch_id: batchId,
    row_index: row.row_index,
    sku: row.sku || null,
    raw: row.raw as Json,
    mapped: (row.mapped ?? null) as Json,
    status: row.status,
    error: row.error,
    warnings: row.warnings,
  };
}

/** Ringkasan distribusi untuk laporan dry-run dan preview admin. */
export function describeStaged(rows: StagedRow[]) {
  const categories: Record<string, number> = {};
  const brands: Record<string, number> = {};
  let withFitment = 0;
  let withBrand = 0;
  for (const r of rows) {
    if (!r.mapped) continue;
    for (const c of r.mapped.category_slugs) categories[c] = (categories[c] ?? 0) + 1;
    if (r.mapped.brand_slug) {
      withBrand += 1;
      brands[r.mapped.brand_name ?? r.mapped.brand_slug] =
        (brands[r.mapped.brand_name ?? r.mapped.brand_slug] ?? 0) + 1;
    }
    if (r.mapped.fitment_suggestions.length) withFitment += 1;
  }
  const sort = (o: Record<string, number>) =>
    Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
  return { categories: sort(categories), brands: sort(brands), withBrand, withFitment };
}
