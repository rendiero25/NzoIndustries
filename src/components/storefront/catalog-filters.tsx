"use client";

import { SlidersHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ShieldMark } from "@/components/catalog/shield-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  CATALOG_SORTS,
  countActiveFilters,
  serializeCatalogParams,
  SORT_LABEL,
  type CatalogParams,
  type CatalogSort,
} from "@/lib/validations/catalog";

export type FilterCategory = { slug: string; name: string; count: number | null; active: boolean };

type Props = {
  basePath: string;
  params: CatalogParams;
  facets: {
    brands: { slug: string; name: string; count: number }[];
    price: { min: number | null; max: number | null };
  };
  categories: FilterCategory[];
  categoryHeading: string;
  /** Brand dikunci oleh rute (/brands/[slug]): filter brand disembunyikan. */
  lockBrand?: boolean;
  vehicleLabel: string | null;
};

function useCatalogNav(basePath: string, params: CatalogParams) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (next: Partial<CatalogParams>, keepPage = false) =>
    startTransition(() =>
      router.push(
        `${basePath}${serializeCatalogParams({ ...params, ...next, page: keepPage ? (next.page ?? params.page) : 1 })}`,
        {
          scroll: false,
        },
      ),
    );
  return { go, pending };
}

/** Urutkan (toolbar atas). */
export function CatalogSortSelect({
  basePath,
  params,
}: {
  basePath: string;
  params: CatalogParams;
}) {
  const { go } = useCatalogNav(basePath, params);
  const options = CATALOG_SORTS.filter((s) => s !== "relevance" || params.q);
  return (
    <Select value={params.sort} onValueChange={(v) => go({ sort: v as CatalogSort })}>
      <SelectTrigger
        className="h-10 min-w-44 bg-background data-[size=default]:h-10"
        aria-label="Urutkan"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {SORT_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterBody(props: Props & { onNavigate?: () => void }) {
  const { basePath, params, facets, categories, categoryHeading, lockBrand, vehicleLabel } = props;
  const { go, pending } = useCatalogNav(basePath, params);
  const [brandQuery, setBrandQuery] = useState("");
  const [min, setMin] = useState(params.min?.toString() ?? "");
  const [max, setMax] = useState(params.max?.toString() ?? "");
  const query = serializeCatalogParams({ ...params, page: 1 });

  const brands = useMemo(() => {
    const selected = new Set(params.brands);
    const list = facets.brands.filter(
      (b) => !brandQuery || b.name.toLowerCase().includes(brandQuery.toLowerCase()),
    );
    // Brand terpilih selalu terlihat walau tidak masuk 60 teratas facet.
    const missing = params.brands
      .filter((s) => !facets.brands.some((b) => b.slug === s))
      .map((s) => ({ slug: s, name: s, count: 0 }));
    return [...missing, ...list].sort(
      (a, b) => Number(selected.has(b.slug)) - Number(selected.has(a.slug)),
    );
  }, [facets.brands, params.brands, brandQuery]);

  const toggleBrand = (slug: string, on: boolean) =>
    go({ brands: on ? [...params.brands, slug] : params.brands.filter((b) => b !== slug) });

  const applyPrice = () => {
    const toNum = (v: string) => (v.replace(/\D/g, "") ? Number(v.replace(/\D/g, "")) : null);
    go({ min: toNum(min), max: toNum(max) });
  };

  return (
    <div className={cn("flex flex-col gap-7", pending && "opacity-70 transition-opacity")}>
      <section aria-labelledby="f-vehicle" className="flex flex-col gap-3">
        <h3 id="f-vehicle" className="text-sm font-semibold">
          Kendaraan
        </h3>
        {vehicleLabel ? (
          <label className="flex items-start justify-between gap-3 text-sm">
            <span className="flex items-start gap-2">
              <ShieldMark className="mt-0.5 size-4 shrink-0" />
              <span>
                Hanya part untuk <span className="font-medium">{vehicleLabel}</span>
              </span>
            </span>
            <Switch
              checked={params.fit}
              onCheckedChange={(v) => go({ fit: v })}
              aria-label="Hanya part untuk kendaraan saya"
            />
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pilih kendaraan di Garasi (header) untuk menyaring part yang cocok.
          </p>
        )}
      </section>

      {categories.length ? (
        <section aria-labelledby="f-category" className="flex flex-col gap-2">
          <h3 id="f-category" className="text-sm font-semibold">
            {categoryHeading}
          </h3>
          <ul className="flex flex-col">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}${query}`}
                  onClick={props.onNavigate}
                  aria-current={c.active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-sm py-1.5 text-sm text-steel-700 hover:text-foreground",
                    c.active && "font-semibold text-foreground",
                  )}
                >
                  <span>{c.name}</span>
                  {c.count != null ? (
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {c.count.toLocaleString("id-ID")}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!lockBrand && facets.brands.length ? (
        <section aria-labelledby="f-brand" className="flex flex-col gap-2">
          <h3 id="f-brand" className="text-sm font-semibold">
            Brand
          </h3>
          {facets.brands.length > 8 ? (
            <Input
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder="Cari brand"
              aria-label="Cari brand"
              className="h-9"
            />
          ) : null}
          <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto pr-1">
            {brands.map((b) => {
              const checked = params.brands.includes(b.slug);
              const id = `brand-${b.slug}`;
              return (
                <li key={b.slug} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(v) => toggleBrand(b.slug, v === true)}
                  />
                  <Label
                    htmlFor={id}
                    className="flex flex-1 cursor-pointer justify-between gap-2 text-sm font-normal"
                  >
                    <span className="line-clamp-1">{b.name}</span>
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {b.count.toLocaleString("id-ID")}
                    </span>
                  </Label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="f-price" className="flex flex-col gap-2">
        <h3 id="f-price" className="text-sm font-semibold">
          Harga
        </h3>
        {facets.price.min != null && facets.price.max != null ? (
          <p className="text-caption text-muted-foreground">
            {formatIDR(facets.price.min)} – {formatIDR(facets.price.max)}
          </p>
        ) : null}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
        >
          <Input
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="Min"
            aria-label="Harga minimum"
            className="h-9"
          />
          <span aria-hidden>–</span>
          <Input
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Maks"
            aria-label="Harga maksimum"
            className="h-9"
          />
          <Button type="submit" size="sm" variant="secondary">
            OK
          </Button>
        </form>
      </section>

      <section aria-labelledby="f-rating" className="flex flex-col gap-2">
        <h3 id="f-rating" className="text-sm font-semibold">
          Rating
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {[4, 3].map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={params.rating === r ? "primary" : "secondary"}
              aria-pressed={params.rating === r}
              onClick={() => go({ rating: params.rating === r ? null : r })}
            >
              <Star className="fill-rating text-rating" aria-hidden />
              {r} ke atas
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="f-stock" className="flex flex-col gap-3">
        <h3 id="f-stock" className="sr-only">
          Ketersediaan
        </h3>
        <label className="flex items-center justify-between gap-3 text-sm">
          Stok tersedia
          <Switch checked={params.inStock} onCheckedChange={(v) => go({ inStock: v })} />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          Sedang diskon
          <Switch checked={params.onSale} onCheckedChange={(v) => go({ onSale: v })} />
        </label>
      </section>

      {countActiveFilters(params) > 0 ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            go({
              brands: [],
              min: null,
              max: null,
              inStock: false,
              rating: null,
              onSale: false,
              fit: false,
            })
          }
          className="self-start"
        >
          <X aria-hidden />
          Hapus semua filter
        </Button>
      ) : null}
    </div>
  );
}

/** Sidebar filter (desktop) + tombol Sheet (mobile). Semua state di URL. */
export function CatalogFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(props.params);
  return (
    <>
      <aside aria-label="Filter produk" className="hidden w-60 shrink-0 lg:block">
        <FilterBody key={serializeCatalogParams(props.params)} {...props} />
      </aside>
      <Button
        type="button"
        variant="secondary"
        className="h-10 lg:hidden"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal aria-hidden />
        Filter{active ? ` (${active})` : ""}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(100%,22rem)] gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-left text-base">Filter</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <FilterBody
              key={serializeCatalogParams(props.params)}
              {...props}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
