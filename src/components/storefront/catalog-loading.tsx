import { ProductGridSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton PLP (bentuk sama dengan CatalogPage, tanpa spinner layar penuh). */
export function CatalogLoading() {
  return (
    <div className="nzo-container py-6 md:py-8" aria-busy="true" aria-label="Memuat produk">
      <Skeleton className="mb-4 h-4 w-48" />
      <Skeleton className="mb-2 h-9 w-64" />
      <Skeleton className="mb-6 h-4 w-28" />
      <div className="flex gap-8">
        <div className="hidden w-60 shrink-0 flex-col gap-4 lg:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
