"use client";

import { useState } from "react";
import { Search, X, Package, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";

const selectClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand";

type ProductSort =
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "rating_desc"
  | "reviews_desc"
  | "sold_desc";
type BrandSort = "name_asc" | "name_desc" | "count_desc" | "count_asc";

const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "name_asc", label: "Nama A–Z" },
  { value: "name_desc", label: "Nama Z–A" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
  { value: "rating_desc", label: "Rating Tertinggi" },
  { value: "reviews_desc", label: "Ulasan Terbanyak" },
  { value: "sold_desc", label: "Terlaris" },
];

const BRAND_SORT_OPTIONS: { value: BrandSort; label: string }[] = [
  { value: "name_asc", label: "Nama A–Z" },
  { value: "name_desc", label: "Nama Z–A" },
  { value: "count_desc", label: "Produk Terbanyak" },
  { value: "count_asc", label: "Produk Tersedikit" },
];

export type ProductOption = {
  id: string;
  name: string;
  slug: string;
  price: number;
  brand_name: string | null;
  condition: string;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  average_rating: number;
  review_count: number;
  total_sold: number;
};

export type BrandOption = {
  id: string;
  name: string;
  product_count: number;
};

interface ProductBrandSelectorProps {
  mode: "manual" | "brand";
  onModeChange: (mode: "manual" | "brand") => void;
  products: ProductOption[];
  brands: BrandOption[];
  categories?: { id: string; name: string }[];
  selectedProductIds: string[];
  selectedBrandIds: string[];
  onProductsChange: (ids: string[]) => void;
  onBrandsChange: (ids: string[]) => void;
  /** When true, brand list is filtered and counted based on the products prop (already filtered externally). */
  filterBrandsByProducts?: boolean;
}

export function ProductBrandSelector({
  mode,
  onModeChange,
  products,
  brands,
  categories = [],
  selectedProductIds,
  selectedBrandIds,
  onProductsChange,
  onBrandsChange,
  filterBrandsByProducts = false,
}: ProductBrandSelectorProps) {
  const [productSearch, setProductSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [productSort, setProductSort] = useState<ProductSort>("name_asc");
  const [brandSearch, setBrandSearch] = useState("");
  const [brandSort, setBrandSort] = useState<BrandSort>("name_asc");

  // ── Per-produk logic ──────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchSearch = `${p.name} ${p.brand_name ?? ""}`
      .toLowerCase()
      .includes(productSearch.toLowerCase());
    const matchCategory = !filterCategory || p.category_id === filterCategory;
    return matchSearch && matchCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (productSort) {
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "rating_desc":
        return b.average_rating - a.average_rating;
      case "reviews_desc":
        return b.review_count - a.review_count;
      case "sold_desc":
        return b.total_sold - a.total_sold;
      default:
        return a.name.localeCompare(b.name); // name_asc
    }
  });

  // ── Per-brand logic ───────────────────────────────────────────────────────
  // Derive brand counts from products prop, respecting both condition filter
  // (already applied externally via props) and the active category filter.
  const productsForBrands = filterCategory
    ? products.filter((p) => p.category_id === filterCategory)
    : products;

  const brandCountsByName: Record<string, number> = {};
  productsForBrands.forEach((p) => {
    if (p.brand_name) brandCountsByName[p.brand_name] = (brandCountsByName[p.brand_name] ?? 0) + 1;
  });

  const shouldFilterBrands = filterBrandsByProducts || !!filterCategory;

  const visibleBrands = shouldFilterBrands
    ? brands.filter((b) => (brandCountsByName[b.name] ?? 0) > 0)
    : brands;

  const getBrandCount = (b: BrandOption) => brandCountsByName[b.name] ?? 0;

  const filteredBrands = visibleBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  const sortedBrands = [...filteredBrands].sort((a, b) => {
    switch (brandSort) {
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "count_desc":
        return getBrandCount(b) - getBrandCount(a);
      case "count_asc":
        return getBrandCount(a) - getBrandCount(b);
      default:
        return a.name.localeCompare(b.name); // name_asc
    }
  });

  const toggleProduct = (id: string) => {
    onProductsChange(
      selectedProductIds.includes(id)
        ? selectedProductIds.filter((x) => x !== id)
        : [...selectedProductIds, id],
    );
  };

  const toggleBrand = (id: string) => {
    onBrandsChange(
      selectedBrandIds.includes(id)
        ? selectedBrandIds.filter((x) => x !== id)
        : [...selectedBrandIds, id],
    );
  };

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={mode}
        onChange={onModeChange}
        fullWidth
        size="compact"
        aria-label="Mode pemilihan promosi"
        options={[
          {
            value: "manual",
            label: (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Package size={12} />
                Per Produk
              </span>
            ),
          },
          {
            value: "brand",
            label: (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Building2 size={12} />
                Per Brand
              </span>
            ),
          },
        ]}
      />

      {mode === "manual" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cari produk..."
                className="h-10 rounded-md border-border bg-card pr-4 pl-10 text-base leading-[1.47]"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={selectClass}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={productSort}
              onChange={(e) => setProductSort(e.target.value as ProductSort)}
              className={selectClass}
            >
              {PRODUCT_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            {sortedProducts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada produk</p>
            ) : (
              sortedProducts.map((p) => {
                const selected = selectedProductIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0",
                      selected ? "bg-brand/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors",
                        selected ? "border-brand bg-brand" : "border-border",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.brand_name ?? "—"} · {formatRupiah(p.price)}
                        {p.condition === "second" && (
                          <span className="ml-1 font-semibold text-amber-700">SECOND</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {selectedProductIds.length} produk dipilih
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Cari brand..."
                className="h-10 rounded-md border-border bg-card pr-4 pl-10 text-base leading-[1.47]"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={selectClass}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={brandSort}
              onChange={(e) => setBrandSort(e.target.value as BrandSort)}
              className={selectClass}
            >
              {BRAND_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {selectedBrandIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedBrandIds.map((id) => {
                const b = brands.find((x) => x.id === id);
                if (!b) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand"
                  >
                    {b.name}
                    <button
                      type="button"
                      onClick={() => toggleBrand(id)}
                      className="rounded p-0.5 hover:bg-brand/20"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            {sortedBrands.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada brand</p>
            ) : (
              sortedBrands.map((b) => {
                const selected = selectedBrandIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBrand(b.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0",
                      selected ? "bg-brand/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rounded border transition-colors",
                        selected ? "border-brand bg-brand" : "border-border",
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{getBrandCount(b)} produk</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {selectedBrandIds.length} brand dipilih · produk diambil otomatis dari brand yang
            dipilih
          </p>
        </div>
      )}
    </div>
  );
}
