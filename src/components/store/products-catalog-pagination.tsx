import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PRODUCTS_CATALOG_PER_PAGE } from "@/lib/data/products-catalog-page";
import { cn } from "@/lib/utils";

export type ProductsCatalogPaginationFilters = {
  category: string;
  brand: string;
  condition: string;
  discount: boolean;
  sort: string;
  minPrice: string;
  maxPrice: string;
  rating: string;
};

type ProductsCatalogPaginationProps = ProductsCatalogPaginationFilters & {
  currentPage: number;
  totalCount: number;
};

function buildHref(page: number, filters: ProductsCatalogPaginationFilters): string {
  const p = new URLSearchParams();
  if (page > 1) p.set("page", String(page));
  if (filters.category) p.set("category", filters.category);
  if (filters.brand) p.set("brand", filters.brand);
  if (filters.condition) p.set("condition", filters.condition);
  if (filters.discount) p.set("discount", "1");
  if (filters.sort && filters.sort !== "latest") p.set("sort", filters.sort);
  if (filters.minPrice) p.set("minPrice", filters.minPrice);
  if (filters.maxPrice) p.set("maxPrice", filters.maxPrice);
  if (filters.rating) p.set("rating", filters.rating);
  const qs = p.toString();
  return qs ? `/products?${qs}` : "/products";
}

export function ProductsCatalogPagination({
  currentPage,
  totalCount,
  ...filters
}: ProductsCatalogPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_CATALOG_PER_PAGE));
  if (totalPages <= 1) return null;

  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label="Navigasi halaman produk"
    >
      <Link
        href={buildHref(prev, filters)}
        aria-disabled={currentPage <= 1}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-foreground transition hover:border-brand/40",
          currentPage <= 1 && "pointer-events-none opacity-40",
        )}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      {pages.map((n) => (
        <Link
          key={n}
          href={buildHref(n, filters)}
          className={cn(
            "flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-sm font-medium transition",
            n === currentPage
              ? "border-foreground bg-foreground text-background"
              : "border-[#e0e0e0] bg-white text-foreground hover:border-brand/40",
          )}
          aria-current={n === currentPage ? "page" : undefined}
        >
          {n}
        </Link>
      ))}

      <Link
        href={buildHref(next, filters)}
        aria-disabled={currentPage >= totalPages}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-foreground transition hover:border-brand/40",
          currentPage >= totalPages && "pointer-events-none opacity-40",
        )}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </nav>
  );
}
