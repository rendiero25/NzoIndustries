"use client";

import { useMemo, useState } from "react";
import { ListFilter, X } from "lucide-react";

import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { HomeProductTile } from "@/components/store/home-product-tile";
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
import type { HomeShelfProduct } from "@/lib/data/home-storefront";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "best_selling";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Rekomendasi" },
  { value: "best_selling", label: "Terlaris" },
  { value: "rating", label: "Rating tertinggi" },
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

type PromoProductsSectionProps = {
  products: HomeShelfProduct[];
};

function uniqueOptions(
  products: HomeShelfProduct[],
  pick: (p: HomeShelfProduct) => string | null | undefined,
  placeholder: string,
) {
  const names = Array.from(new Set(products.map(pick).filter((v): v is string => Boolean(v)))).sort(
    (a, b) => a.localeCompare(b),
  );
  return [{ value: "", label: placeholder }, ...names.map((n) => ({ value: n, label: n }))];
}

export function PromoProductsSection({ products }: PromoProductsSectionProps) {
  const [sort, setSort] = useState<SortKey>("relevance");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("");
  const [rating, setRating] = useState("");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");

  const categoryOptions = useMemo(
    () => uniqueOptions(products, (p) => p.categoryName, "Kategori"),
    [products],
  );
  const brandOptions = useMemo(
    () => uniqueOptions(products, (p) => p.brandName, "Brand"),
    [products],
  );
  const hasConditionData = useMemo(() => products.some((p) => p.condition != null), [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (category) {
      list = list.filter((p) => p.categoryName === category);
    }
    if (brand) {
      list = list.filter((p) => p.brandName === brand);
    }
    if (condition) {
      list = list.filter((p) => p.condition === condition);
    }
    if (rating) {
      const min = Number(rating);
      list = list.filter((p) => p.rating >= min);
    }
    if (discountOnly) {
      list = list.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.currentPrice);
    }
    if (appliedMinPrice) {
      const min = Number(appliedMinPrice);
      list = list.filter((p) => p.currentPrice >= min);
    }
    if (appliedMaxPrice) {
      const max = Number(appliedMaxPrice);
      list = list.filter((p) => p.currentPrice <= max);
    }

    if (sort === "relevance") return list;
    const sorted = [...list];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case "best_selling":
        sorted.sort((a, b) => b.soldCount - a.soldCount);
        break;
    }
    return sorted;
  }, [
    products,
    sort,
    category,
    brand,
    condition,
    rating,
    discountOnly,
    appliedMinPrice,
    appliedMaxPrice,
  ]);

  const applyPrice = () => {
    setAppliedMinPrice(minPriceInput.trim());
    setAppliedMaxPrice(maxPriceInput.trim());
  };

  const priceLabel =
    appliedMinPrice || appliedMaxPrice
      ? `${appliedMinPrice ? formatRupiah(Number(appliedMinPrice)) : "Rp 0"} – ${appliedMaxPrice ? formatRupiah(Number(appliedMaxPrice)) : "tanpa batas"}`
      : "Harga";

  const hasFilters = Boolean(
    category || brand || condition || rating || discountOnly || appliedMinPrice || appliedMaxPrice,
  );

  const clearAll = () => {
    setCategory("");
    setBrand("");
    setCondition("");
    setRating("");
    setDiscountOnly(false);
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
  };

  const filterControls = (
    <>
      {categoryOptions.length > 1 ? (
        <FilterDropdown
          aria-label="Kategori produk"
          className={filterTriggerClass}
          value={category}
          options={categoryOptions}
          active={Boolean(category)}
          onValueChange={setCategory}
        />
      ) : null}
      {brandOptions.length > 1 ? (
        <FilterDropdown
          aria-label="Brand produk"
          className={filterTriggerClass}
          value={brand}
          options={brandOptions}
          active={Boolean(brand)}
          onValueChange={setBrand}
        />
      ) : null}
      {hasConditionData ? (
        <FilterDropdown
          aria-label="Kondisi produk"
          className={filterTriggerClass}
          value={condition}
          options={CONDITION_OPTIONS}
          active={Boolean(condition)}
          onValueChange={setCondition}
        />
      ) : null}
      <FilterDropdown
        aria-label="Rating produk"
        className={filterTriggerClass}
        value={rating}
        options={RATING_OPTIONS}
        active={Boolean(rating)}
        onValueChange={setRating}
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
        onClick={() => setDiscountOnly((v) => !v)}
      >
        Sedang diskon
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={appliedMinPrice || appliedMaxPrice ? "dark" : "table-action"}
            size="sm"
            style={
              appliedMinPrice || appliedMaxPrice
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
            <label htmlFor="promo-price-min" className="sr-only">
              Harga minimum
            </label>
            <Input
              id="promo-price-min"
              inputMode="numeric"
              placeholder="Rp min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value.replace(/\D/g, ""))}
              className="h-9"
            />
            <span className="text-muted-foreground" aria-hidden>
              –
            </span>
            <label htmlFor="promo-price-max" className="sr-only">
              Harga maksimum
            </label>
            <Input
              id="promo-price-max"
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
    </>
  );

  const sortSelect = (
    <div className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">Urutkan:</span>
      <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
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
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
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

          {/* display:contents — kontrol jadi flex item langsung dari baris di atas, biar filter+reset satu baris di sm+ */}
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
            <span className="font-semibold text-foreground">{filtered.length}</span> produk
          </p>
          {sortSelect}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok dengan filter.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((p) => (
            <HomeProductTile key={`${p.productId}-${p.variantId}`} product={p} layout="fluidRow" />
          ))}
        </div>
      )}
    </div>
  );
}
