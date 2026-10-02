import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HomeProductTile } from "@/components/store/home-product-tile";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type ProductsCatalogGridProps = {
  products: HomeShelfProduct[];
  hasActiveFilters: boolean;
};

export function ProductsCatalogGrid({ products, hasActiveFilters }: ProductsCatalogGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"
          aria-hidden
        >
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Produk tidak ditemukan</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Tidak ada produk yang cocok dengan filter saat ini. Coba ubah atau hapus beberapa filter."
              : "Belum ada produk aktif di katalog ini."}
          </p>
        </div>
        {hasActiveFilters ? (
          <Button asChild type="button" variant="secondary" size="sm">
            <Link href="/products">Hapus semua filter</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
      {products.map((p) => (
        <div key={`${p.productId}-${p.variantId}`} className="min-w-0">
          <HomeProductTile product={p} layout="promoRow" className="h-full" compact />
        </div>
      ))}
    </div>
  );
}
