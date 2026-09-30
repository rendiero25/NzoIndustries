/** Opsi urutan katalog halaman brand (query `sort`). */
export type BrandStoreSortKey =
  "latest" | "price-asc" | "price-desc" | "name-asc" | "name-desc" | "best_selling";

export type BrandStoreCategoryOption = {
  id: string;
  name: string;
  slug: string;
};
