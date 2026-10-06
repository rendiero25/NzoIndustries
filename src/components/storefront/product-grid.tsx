import { ProductCard, type CatalogProductCard } from "@/components/catalog/product-card";
import { cn } from "@/lib/utils";

import { CardCartButton, WishlistButton } from "./card-actions";

type Props = {
  items: CatalogProductCard[];
  wishlistIds?: ReadonlySet<string>;
  /** Jumlah kartu pertama yang diprioritaskan (LCP). */
  priorityCount?: number;
  className?: string;
};

/** Grid kartu produk 2/3/4 kolom (design-system §5) dengan aksi keranjang & wishlist. */
export function ProductGrid({ items, wishlistIds, priorityCount = 4, className }: Props) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4", className)}>
      {items.map((p, i) => (
        <li key={p.id ?? p.slug} className="min-w-0">
          <ProductCard
            product={p}
            priority={i < priorityCount}
            action={
              p.id ? (
                <CardCartButton productId={p.id} slug={p.slug} hasVariants={p.hasVariants} />
              ) : undefined
            }
            topAction={
              p.id ? (
                <WishlistButton productId={p.id} initialSaved={wishlistIds?.has(p.id) ?? false} />
              ) : undefined
            }
            className="h-full"
          />
        </li>
      ))}
    </ul>
  );
}
