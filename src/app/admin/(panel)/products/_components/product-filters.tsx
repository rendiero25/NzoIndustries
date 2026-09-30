"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

interface ProductFiltersProps {
  categories: Category[];
  brands?: Brand[];
}

const statusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

const conditionOptions = [
  { value: "all", label: "Semua Kondisi" },
  { value: "new", label: "Baru" },
  { value: "second", label: "Second" },
];

const sortOptions = [
  { value: "latest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "name-asc", label: "Nama A-Z" },
  { value: "name-desc", label: "Nama Z-A" },
  { value: "price-asc", label: "Harga Termurah" },
  { value: "price-desc", label: "Harga Termahal" },
];

export function ProductFilters({ categories, brands = [] }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const condition = searchParams.get("condition") ?? "all";
  const brandId = searchParams.get("brand") ?? "";
  const categoryId = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "latest";

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const clearAll = () => {
    router.push(pathname);
  };

  const hasFilters =
    Boolean(q) ||
    status !== "all" ||
    condition !== "all" ||
    Boolean(brandId) ||
    Boolean(categoryId) ||
    sort !== "latest";

  const brandOptions = [
    { value: "__all__", label: "Semua Merek" },
    ...brands.map((b) => ({ value: b.id, label: b.name })),
  ];

  const categoryOptions = [
    { value: "__all__", label: "Semua Kategori" },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari nama produk..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParam("q", val), 400);
          }}
          className="h-11 rounded-md border-[#e0e0e0] pl-10 text-[17px] leading-[1.47]"
        />
      </div>

      <FilterDropdown
        aria-label="Status produk"
        value={status || "all"}
        options={statusOptions}
        onValueChange={(v) => updateParam("status", v === "all" ? "" : v)}
      />

      <FilterDropdown
        aria-label="Kondisi produk"
        value={condition || "all"}
        options={conditionOptions}
        onValueChange={(v) => updateParam("condition", v === "all" ? "" : v)}
      />

      {brands.length > 0 ? (
        <FilterDropdown
          aria-label="Merek produk"
          value={brandId || "__all__"}
          options={brandOptions}
          onValueChange={(v) => updateParam("brand", v === "__all__" ? "" : v)}
        />
      ) : null}

      {categories.length > 0 ? (
        <FilterDropdown
          aria-label="Kategori produk"
          value={categoryId || "__all__"}
          options={categoryOptions}
          onValueChange={(v) => updateParam("category", v === "__all__" ? "" : v)}
        />
      ) : null}

      <FilterDropdown
        aria-label="Urutkan produk"
        value={sort}
        options={sortOptions}
        onValueChange={(v) => updateParam("sort", v === "latest" ? "" : v)}
      />

      {hasFilters ? (
        <Button
          type="button"
          variant="pearl"
          size="sm"
          className="shrink-0 gap-1.5 border-dashed text-muted-foreground"
          onClick={clearAll}
        >
          <X size={12} />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
