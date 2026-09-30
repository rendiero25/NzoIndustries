"use client";

import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

function buildUrl(searchParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(searchParams.toString());
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/dashboard/wishlist?${qs}` : "/dashboard/wishlist";
}

export function WishlistPagination({
  total,
  perPage,
  currentPage,
}: {
  total: number;
  perPage: number;
  currentPage: number;
}) {
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <p className="text-xs text-[#7a7a7a]">
        Halaman {currentPage} dari {totalPages} · {total} item
      </p>
      <div className="flex items-center gap-1">
        <Button
          asChild
          variant="pearl"
          size="icon-sm"
          className="min-h-9 min-w-9"
          aria-disabled={currentPage <= 1}
        >
          <a
            href={buildUrl(searchParams, currentPage - 1)}
            aria-label="Halaman sebelumnya"
            className={currentPage <= 1 ? "pointer-events-none opacity-40" : undefined}
          >
            <ChevronLeft className="h-4 w-4" />
          </a>
        </Button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-[#7a7a7a]">
              …
            </span>
          ) : (
            <Button
              key={p}
              asChild
              variant={p === currentPage ? "primary" : "pearl"}
              size="icon-sm"
              className="min-h-9 min-w-9 text-sm"
              aria-current={p === currentPage ? "page" : undefined}
            >
              <a href={buildUrl(searchParams, p)}>{p}</a>
            </Button>
          ),
        )}

        <Button
          asChild
          variant="pearl"
          size="icon-sm"
          className="min-h-9 min-w-9"
          aria-disabled={currentPage >= totalPages}
        >
          <a
            href={buildUrl(searchParams, currentPage + 1)}
            aria-label="Halaman berikutnya"
            className={currentPage >= totalPages ? "pointer-events-none opacity-40" : undefined}
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
