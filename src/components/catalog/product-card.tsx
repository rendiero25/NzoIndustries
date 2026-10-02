import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { discountPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

import { FitmentBadge } from "./fitment-badge";
import { Price } from "./price";
import { ProductImage } from "./product-image";

export type CatalogProductCard = {
  slug: string;
  name: string;
  brandName?: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  averageRating: number;
  reviewCount: number;
  totalSold: number;
  imagePublicId?: string | null;
  /** true bila produk cocok dengan kendaraan aktif di Garasi. */
  fits?: boolean;
};

type ProductCardProps = {
  product: CatalogProductCard;
  /** Tombol tambah ke keranjang (client), disuntik dari luar. */
  action?: ReactNode;
  priority?: boolean;
  className?: string;
};

const soldFormat = new Intl.NumberFormat("id-ID", { notation: "compact" });

/**
 * Kartu produk (design-system.md §5): gambar 1:1 → badge → nama 2 baris →
 * rating & terjual → harga. Hover desktop: naik 2px, bayangan, zoom 1.03.
 */
export function ProductCard({ product, action, priority, className }: ProductCardProps) {
  const saving = discountPercent(product.price, product.compareAtPrice);
  const soldOut = product.stock <= 0;

  return (
    <article
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-lg border border-border bg-card",
        "transition-[transform,box-shadow] duration-200 ease-out-nzo",
        "hover:shadow-[0_10px_28px_-12px_rgb(0_0_0/0.25)] motion-safe:hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-steel-50">
        <div className="size-full transition-transform duration-300 ease-out-nzo motion-safe:group-hover/card:scale-[1.03]">
          <ProductImage
            publicId={product.imagePublicId}
            alt={product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
          />
        </div>

        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
          {soldOut ? (
            <span className="rounded-sm bg-danger px-1.5 py-0.5 text-caption font-semibold text-white">
              Stok habis
            </span>
          ) : saving ? (
            <span className="rounded-sm bg-signal px-1.5 py-0.5 text-caption font-semibold text-brand-black">
              -{saving}%
            </span>
          ) : null}
          {product.fits ? <FitmentBadge /> : null}
        </div>

        {action && !soldOut ? (
          <div className="absolute right-2 bottom-2 z-10 transition-opacity duration-200 md:opacity-0 md:group-focus-within/card:opacity-100 md:group-hover/card:opacity-100">
            {action}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.brandName ? (
          <p className="text-caption text-muted-foreground">{product.brandName}</p>
        ) : null}
        <h3 className="line-clamp-2 text-[0.9375rem] leading-5 font-medium tracking-normal">
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {product.reviewCount > 0 || product.totalSold > 0 ? (
          <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
            {product.reviewCount > 0 ? (
              <>
                <Star className="size-3.5 fill-rating text-rating" aria-hidden="true" />
                <span className="font-medium text-foreground tabular-nums">
                  {product.averageRating.toFixed(1)}
                </span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            {product.totalSold > 0 ? (
              <span>{soldFormat.format(product.totalSold)} terjual</span>
            ) : null}
          </p>
        ) : null}
        <Price price={product.price} compareAt={product.compareAtPrice} className="mt-auto pt-1" />
      </div>
    </article>
  );
}
