import Link from "next/link";

import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";

import { HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type HomeLatestProductsSectionProps = {
  products: HomeShelfProduct[];
};

/** Section "Produk Terbaru" — selalu tampil di beranda, di bawah Flash Sale. */
export function HomeLatestProductsSection({ products }: HomeLatestProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
          <h3 className="text-base leading-snug font-bold text-foreground sm:text-lg">
            Produk Terbaru
          </h3>
          <Link
            href="/products"
            className="shrink-0 text-sm font-semibold text-neutral-700 transition hover:text-neutral-900"
          >
            View All
          </Link>
        </div>

        <HorizontalScrollRow
          gapClass="gap-3 sm:gap-4"
          fillRow={products.length <= 6}
          itemsPerSlide={6}
        >
          {products.length <= 6 ? (
            <>
              {products.map((p) => (
                <div
                  key={`${p.productId}-${p.variantId}`}
                  className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}
                >
                  <HomeProductTile product={p} layout="fluidRow" compact />
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - products.length) }, (_, i) => (
                <div
                  key={`latest-row-pad-${i}`}
                  className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}
                  aria-hidden
                />
              ))}
            </>
          ) : (
            products.map((p) => (
              <div
                key={`${p.productId}-${p.variantId}`}
                className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}
              >
                <HomeProductTile product={p} layout="promoRow" className="h-full" compact />
              </div>
            ))
          )}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}
