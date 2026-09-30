import Image from "next/image";
import Link from "next/link";
import { HOME_PRODUCT_FIVE_ACROSS_IMAGE_SIZES } from "@/lib/constants/home-product-row-slot";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type HomeProductTileProps = {
  product: HomeShelfProduct;
  className?: string;
  /** `promoRow` / `fluidRow`: slot lebar 1/5 baris (≈254px gambar persegi pada kontainer max 1400px + gap-4); pakai `HOME_PRODUCT_FIVE_ACROSS_*`. */
  layout?: "default" | "promoRow" | "fluidRow";
  /** Saat true: hanya gambar, nama produk, harga, dan info diskon — sembunyikan eyebrow, varian, rating, dan jumlah terjual. */
  compact?: boolean;
  /** Override label di atas nama produk (mis. nama brand di halaman detail brand). Tetap tampil walau `compact`. */
  brandLabel?: string;
};

export function HomeProductTile({
  product,
  className,
  layout = "default",
  compact = false,
  brandLabel,
}: HomeProductTileProps) {
  const href = `/products/${product.slug}`;
  const showCompare =
    product.compareAtPrice != null && product.compareAtPrice > product.currentPrice;
  const discountPct = showCompare
    ? Math.round((1 - product.currentPrice / product.compareAtPrice!) * 100)
    : 0;
  const imageSizes = layout === "default" ? "208px" : HOME_PRODUCT_FIVE_ACROSS_IMAGE_SIZES;

  return (
    <article
      className={cn(
        "flex snap-start flex-col",
        layout === "default" && "w-[min(100%,11.5rem)] shrink-0 sm:w-52",
        layout === "promoRow" && "h-full w-full min-w-0 shrink-0",
        layout === "fluidRow" && "h-full min-h-0 w-full min-w-0",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-square">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes={imageSizes}
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase">
            Tanpa gambar
          </div>
        )}
        {showCompare && (
          <span className="absolute top-1.5 right-1.5 rounded bg-brand px-2 py-1 text-xs font-bold text-white">
            {discountPct}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {brandLabel ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">{brandLabel}</p>
        ) : (
          !compact && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{product.eyebrow}</p>
          )
        )}
        <Link
          href={href}
          className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-semibold text-foreground hover:text-brand"
        >
          {product.name}
        </Link>
        {!compact && product.variantName && (
          <p className="line-clamp-1 text-[14px] text-muted-foreground">{product.variantName}</p>
        )}
        <div className="mt-auto space-y-0.5">
          <p className="text-sm font-bold text-foreground">{formatRupiah(product.currentPrice)}</p>
          {showCompare && (
            <p className="text-xs text-muted-foreground/70 line-through">
              {formatRupiah(product.compareAtPrice!)}
            </p>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {product.reviewCount > 0 ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <svg
                    className="h-3 w-3 shrink-0 text-rating"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-medium text-[--color-rating]">
                    {product.rating.toFixed(1)}
                  </span>
                </span>
                <span className="text-muted-foreground/40">·</span>
              </>
            ) : null}
            <span>{product.soldCount} terjual</span>
          </div>
        )}
      </div>
    </article>
  );
}
