"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, X } from "lucide-react";

import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CategoryStorePublicCategory } from "@/lib/data/category-store-page";
import type {
  ProductsCatalogBrandOption,
  ProductsCatalogSortKey,
} from "@/lib/data/products-catalog-page";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: ProductsCatalogSortKey; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "popular", label: "Populer" },
  { value: "best_selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga termurah" },
  { value: "price-desc", label: "Harga termahal" },
];

const RATING_OPTIONS = [
  { value: "", label: "Rating" },
  { value: "4", label: "4 bintang & ke atas" },
  { value: "3", label: "3 bintang & ke atas" },
];

const CONDITION_OPTIONS = [
  { value: "", label: "Kondisi" },
  { value: "new", label: "Baru" },
  { value: "second", label: "Bekas" },
];

const filterTriggerClass = "h-11 min-h-11 w-full rounded-md bg-white sm:w-auto";

type ProductsCatalogFiltersProps = {
  categories: CategoryStorePublicCategory[];
  brands: ProductsCatalogBrandOption[];
  totalCount: number;
};

function buildQueryString(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function ProductsCatalogFilters({
  categories,
  brands,
  totalCount,
}: ProductsCatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") ?? "");

  // Resync local input state when searchParams change externally (Reset button,
  // browser back/forward) — setState-during-render, not an effect, so it doesn't
  // trigger an extra commit. See https://react.dev/learn/you-might-not-need-an-effect
  const searchParamsKey = searchParams.toString();
  const [syncedKey, setSyncedKey] = useState(searchParamsKey);
  if (syncedKey !== searchParamsKey) {
    setSyncedKey(searchParamsKey);
    setMinPriceInput(searchParams.get("minPrice") ?? "");
    setMaxPriceInput(searchParams.get("maxPrice") ?? "");
  }

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      next.delete("page");
      router.push(`${pathname}${buildQueryString(next)}`);
    },
    [router, pathname, searchParams],
  );

  const categorySlug = searchParams.get("category") ?? "";
  const brandSlug = searchParams.get("brand") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const discountOnly = searchParams.get("discount") === "1";
  const sort = (searchParams.get("sort") ?? "latest") as ProductsCatalogSortKey;
  const rating = searchParams.get("rating") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const categoryOptions = [
    { value: "", label: "Kategori" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];
  const brandOptions = [
    { value: "", label: "Brand" },
    ...brands.map((b) => ({ value: b.slug, label: b.name })),
  ];

  const applyPrice = useCallback(() => {
    pushParams((p) => {
      const min = minPriceInput.trim();
      const max = maxPriceInput.trim();
      if (min) p.set("minPrice", min);
      else p.delete("minPrice");
      if (max) p.set("maxPrice", max);
      else p.delete("maxPrice");
    });
  }, [minPriceInput, maxPriceInput, pushParams]);

  const priceLabel =
    minPrice || maxPrice
      ? `${minPrice ? formatRupiah(Number(minPrice)) : "Rp 0"} – ${maxPrice ? formatRupiah(Number(maxPrice)) : "tanpa batas"}`
      : "Harga";

  const hasFilters = Boolean(
    categorySlug ||
    brandSlug ||
    condition ||
    discountOnly ||
    minPrice ||
    maxPrice ||
    rating ||
    sort !== "latest",
  );

  const clearAll = useCallback(() => {
    setMinPriceInput("");
    setMaxPriceInput("");
    const next = new URLSearchParams();
    const category = searchParams.get("category");
    if (category) next.set("category", category);
    router.push(`${pathname}${buildQueryString(next)}`);
  }, [router, pathname, searchParams]);

  const filterControls = (
    <>
      <FilterDropdown
        aria-label="Kategori produk"
        className={filterTriggerClass}
        value={categorySlug}
        options={categoryOptions}
        active={categoryOptions.some((o) => o.value === categorySlug)}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("category", v);
            else p.delete("category");
          })
        }
      />
      <FilterDropdown
        aria-label="Brand produk"
        className={filterTriggerClass}
        value={brandSlug}
        options={brandOptions}
        active={Boolean(brandSlug)}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("brand", v);
            else p.delete("brand");
          })
        }
      />
      <FilterDropdown
        aria-label="Kondisi produk"
        className={filterTriggerClass}
        value={condition}
        options={CONDITION_OPTIONS}
        active={Boolean(condition)}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("condition", v);
            else p.delete("condition");
          })
        }
      />
      <Button
        type="button"
        variant={discountOnly ? "dark" : "table-action"}
        size="sm"
        style={
          discountOnly
            ? { backgroundColor: "#1d1d1f", color: "#fff", borderColor: "transparent" }
            : undefined
        }
        className={filterTriggerClass}
        onClick={() =>
          pushParams((p) => {
            if (!discountOnly) p.set("discount", "1");
            else p.delete("discount");
          })
        }
      >
        Sedang diskon
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={minPrice || maxPrice ? "dark" : "table-action"}
            size="sm"
            style={
              minPrice || maxPrice
                ? { backgroundColor: "#1d1d1f", color: "#fff", borderColor: "transparent" }
                : undefined
            }
            className={cn(filterTriggerClass, "justify-between")}
          >
            <span className="truncate">{priceLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <p className="text-xs font-medium text-muted-foreground">Rentang harga</p>
          <div className="flex items-center gap-2">
            <label htmlFor="products-price-min" className="sr-only">
              Harga minimum
            </label>
            <Input
              id="products-price-min"
              inputMode="numeric"
              placeholder="Rp min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value.replace(/\D/g, ""))}
              className="h-9"
            />
            <span className="text-muted-foreground" aria-hidden>
              –
            </span>
            <label htmlFor="products-price-max" className="sr-only">
              Harga maksimum
            </label>
            <Input
              id="products-price-max"
              inputMode="numeric"
              placeholder="Rp maks"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value.replace(/\D/g, ""))}
              className="h-9"
            />
          </div>
          <Button type="button" variant="primary" size="sm" className="w-full" onClick={applyPrice}>
            Terapkan
          </Button>
        </PopoverContent>
      </Popover>
      <FilterDropdown
        aria-label="Rating produk"
        className={filterTriggerClass}
        value={rating}
        options={RATING_OPTIONS}
        active={Boolean(rating)}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("rating", v);
            else p.delete("rating");
          })
        }
      />
    </>
  );

  const sortByText = (
    <div className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">Urutkan:</span>
      <Select
        value={sort}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v && v !== "latest") p.set("sort", v);
            else p.delete("sort");
          })
        }
      >
        <SelectTrigger
          aria-label="Urutkan produk"
          className="w-auto gap-1.5 rounded-none border-0 bg-transparent p-0 font-semibold text-foreground shadow-none hover:bg-transparent focus-visible:border-0 focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="dark"
                size="default"
                className="relative shrink-0 sm:hidden"
              >
                <ListFilter className="h-4 w-4" />
                Filter
                {hasFilters ? (
                  <span
                    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand"
                    aria-hidden
                  />
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filter</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4">{filterControls}</div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="primary" className="w-full">
                    Tampilkan hasil
                  </Button>
                </SheetClose>
                {hasFilters ? (
                  <Button type="button" variant="ghost" className="w-full" onClick={clearAll}>
                    Hapus semua filter
                  </Button>
                ) : null}
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* display:contents — kontrol jadi flex item langsung dari baris di atas, biar filter satu baris di sm+ */}
          <div className="hidden sm:contents">
            {filterControls}
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
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalCount}</span> produk ditemukan
          </p>
          {sortByText}
        </div>
      </div>
    </div>
  );
}
