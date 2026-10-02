"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StockVariantRow = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reserved: number;
  productName: string;
};

type StockVariantsTableProps = {
  variants: StockVariantRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
};

export function StockVariantsTable({
  variants,
  page,
  totalPages,
  totalCount,
  perPage,
}: StockVariantsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const firstItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalCount);

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="space-y-4">
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Produk", "Varian", "SKU", "Stok", "Reserved", "Tersedia", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-[10px] font-semibold whitespace-nowrap text-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-foreground">
                    Tidak ada varian ditemukan
                  </td>
                </tr>
              ) : (
                variants.map((v) => {
                  const available = v.stock - v.reserved;
                  const badgeCls =
                    v.stock === 0
                      ? "bg-destructive/10 text-destructive"
                      : v.stock <= 5
                        ? "bg-brand/10 text-brand"
                        : "bg-emerald-500/15 text-emerald-800";
                  const badgeLabel = v.stock === 0 ? "Habis" : v.stock <= 5 ? "Kritis" : "Aman";

                  return (
                    <tr key={v.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/admin/products?q=${encodeURIComponent(v.productName)}`}
                          className="text-foreground transition-colors hover:text-brand"
                        >
                          {v.productName || "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-foreground">{v.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-foreground">{v.sku}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{v.stock}</td>
                      <td className="px-5 py-3 text-foreground">{v.reserved}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {Math.max(0, available)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                            badgeCls,
                          )}
                        >
                          {badgeLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground">
            Menampilkan {firstItem}–{lastItem} dari {totalCount} varian
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="flex h-8 items-center border-y border-border px-3 text-xs font-semibold uppercase">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
