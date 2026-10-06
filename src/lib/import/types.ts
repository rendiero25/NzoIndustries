/**
 * Bentuk data import yang dipakai bersama oleh script CLI dan halaman admin.
 * Satu `MappedProduct` = satu baris `import_products` (varian di dalamnya),
 * lalu di-commit oleh RPC `import_commit_batch` (migration 20261006000100).
 */

export type MappedVariant = {
  sku: string;
  source_sku: string | null;
  name: string;
  options: Record<string, string>;
  /** null = ikut harga produk (D-18). */
  price: number | null;
  compare_at_price: number | null;
  weight_grams: number | null;
  stock: number | null;
  sort_order: number;
};

export type MappedSpec = { label: string; value: string; sort_order: number };

export type FitmentSuggestion = {
  make_slug: string;
  model_slug: string;
  vehicle_type: "motorcycle" | "car";
};

export type MappedProduct = {
  name: string;
  slug: string;
  sku: string;
  source_sku: string | null;
  search_keywords: string | null;
  price: number;
  compare_at_price: number | null;
  weight_grams: number | null;
  stock: number | null;
  brand_name: string | null;
  brand_slug: string | null;
  category_slugs: string[];
  specs: MappedSpec[];
  variants: MappedVariant[];
  /** Saran saja, tidak di-commit (dikonfirmasi admin di Fase 8). */
  fitment_suggestions: FitmentSuggestion[];
};

export type StagedRow = {
  row_index: number;
  sku: string;
  raw: Record<string, unknown>;
  mapped: MappedProduct | null;
  status: "valid" | "invalid";
  error: string | null;
  warnings: string[];
};

export type ImportSummary = {
  products: number;
  variants: number;
  valid: number;
  invalid: number;
  normalizedSkus: number;
  warnings: number;
};
