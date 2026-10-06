import { PackageSearch, X } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { ShieldMark } from "@/components/catalog/shield-mark";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serializeCatalogParams, type CatalogParams } from "@/lib/validations/catalog";
import { getWishlistIds } from "@/server/actions/wishlist";
import { getCatalogFacets, searchCatalog, type CatalogScope } from "@/server/queries/catalog";
import { getCategoryTree } from "@/server/queries/reference";
import { getActiveVehicle } from "@/server/queries/vehicle";

import { CatalogFilters, CatalogSortSelect, type FilterCategory } from "./catalog-filters";
import { ProductGrid } from "./product-grid";

export type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  breadcrumbs: Crumb[];
  basePath: string;
  params: CatalogParams;
  scope?: CatalogScope;
  /** Konten di atas grid (mis. flash sale di /promo). */
  children?: React.ReactNode;
};

const num = new Intl.NumberFormat("id-ID");

/**
 * PLP bersama (design-system §5): breadcrumb, judul + jumlah, banner
 * kecocokan, filter (sidebar/Sheet), urutkan, grid, pagination bernomor.
 */
export async function CatalogPage({
  title,
  description,
  breadcrumbs,
  basePath,
  params,
  scope = {},
  children,
}: Props) {
  const vehicle = await getActiveVehicle();
  const [result, facets, tree, wishlist] = await Promise.all([
    searchCatalog(params, scope, vehicle),
    getCatalogFacets(params, scope, vehicle),
    getCategoryTree(),
    getWishlistIds(),
  ]);

  const counts = new Map(facets.categories.map((c) => [c.slug, c.count]));
  let categories: FilterCategory[];
  let categoryHeading = "Kategori";
  const current = scope.categorySlug ?? null;
  const root = tree.find((r) => r.slug === current || r.children.some((c) => c.slug === current));
  if (root) {
    categoryHeading = root.name;
    categories = root.children.map((c) => ({
      slug: c.slug,
      name: c.name,
      count: counts.get(c.slug) ?? 0,
      active: c.slug === current,
    }));
  } else {
    categories = tree
      .filter((r) => r.slug !== "belum-dikategorikan")
      .map((r) => ({
        slug: r.slug,
        name: r.name,
        count: r.children.reduce((n, c) => n + (counts.get(c.slug) ?? 0), counts.get(r.slug) ?? 0),
        active: false,
      }));
  }

  const showingFit = params.fit && vehicle;
  const withoutFit = `${basePath}${serializeCatalogParams({ ...params, fit: false, page: 1 })}`;

  return (
    <div className="nzo-container py-6 md:py-8">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          {breadcrumbs.map((c, i) => (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {c.href && i < breadcrumbs.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-[1.75rem] leading-9 md:text-[2.25rem] md:leading-[2.75rem]">{title}</h1>
        <p className="text-muted-foreground">
          {description ? `${description} · ` : ""}
          {num.format(result.total)} produk
        </p>
      </header>

      {showingFit ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg bg-signal-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            <ShieldMark className="size-4 shrink-0" />
            <span>
              Menampilkan part untuk <span className="font-semibold">{vehicle.label}</span>
            </span>
          </p>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Tampilkan semua part">
            <Link href={withoutFit} scroll={false}>
              <X />
            </Link>
          </Button>
        </div>
      ) : null}

      {children}

      <div className="flex gap-8">
        <CatalogFilters
          basePath={basePath}
          params={params}
          facets={facets}
          categories={categories}
          categoryHeading={categoryHeading}
          lockBrand={!!scope.brandSlug}
          vehicleLabel={vehicle?.label ?? null}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-end gap-2 max-lg:justify-between">
            <span className="lg:hidden" />
            <CatalogSortSelect basePath={basePath} params={params} />
          </div>

          {result.items.length ? (
            <>
              <ProductGrid items={result.items} wishlistIds={new Set(wishlist)} />
              <CatalogPagination
                basePath={basePath}
                params={params}
                page={result.page}
                pageCount={result.pageCount}
              />
            </>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="Belum ada part yang cocok"
              description={
                showingFit
                  ? `Belum ada part untuk ${vehicle.label} dengan filter ini. Coba tampilkan semua part atau ubah filter.`
                  : "Coba kata kunci lain atau kurangi filter."
              }
              action={
                showingFit
                  ? { label: "Tampilkan semua part", href: withoutFit }
                  : { label: "Lihat semua part", href: "/products" }
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function pageWindow(page: number, count: number): (number | "gap")[] {
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

function CatalogPagination({
  basePath,
  params,
  page,
  pageCount,
}: {
  basePath: string;
  params: CatalogParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => `${basePath}${serializeCatalogParams({ ...params, page: p })}`;
  const cell = "inline-flex size-10 items-center justify-center rounded-md text-sm tabular-nums";
  return (
    <nav aria-label="Halaman" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(cell, "w-auto px-3 hover:bg-muted")} rel="prev">
          Sebelumnya
        </Link>
      ) : null}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={cn(cell, "text-muted-foreground")} aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              cell,
              p === page ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(cell, "w-auto px-3 hover:bg-muted")} rel="next">
          Berikutnya
        </Link>
      ) : null}
    </nav>
  );
}
