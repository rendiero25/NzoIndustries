import Link from "next/link";

import { HomePromoBannerStrip } from "@/components/store/home-promo-banner-strip";
import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";
import { HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";

import { fetchDynamicHomePromoBlocks } from "@/lib/data/home-storefront";
import type {
  DynamicPromoBlock,
  FetchDynamicHomePromoBlocksOptions,
} from "@/lib/data/home-storefront";

/** Async server component — fetches its own data and renders. Use inside a Suspense boundary. */
export async function HomeDynamicPromoBlocksFetcher({
  excludeFlashSaleIds,
}: FetchDynamicHomePromoBlocksOptions) {
  let blocks: DynamicPromoBlock[] = [];
  try {
    blocks = await fetchDynamicHomePromoBlocks({ excludeFlashSaleIds });
  } catch {
    blocks = [];
  }
  return <HomeDynamicPromoBlocks blocks={blocks} />;
}

/** Setiap blok promosi: maks. 5 produk tampil sekaligus; sisanya geser kiri/kanan. */
export function HomeDynamicPromoBlocks({ blocks }: { blocks: DynamicPromoBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="mb-10 space-y-0">
      {blocks.map((block, blockIndex) => (
        <section
          key={`${block.sectionKey}-${blockIndex}`}
          className="bg-background py-6 [contain-intrinsic-size:auto_400px] [content-visibility:auto] sm:py-8"
        >
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
            <div className="mb-4 space-y-2 sm:mb-5">
              {block.linkUrl ? (
                <Link href={block.linkUrl} className="group inline-block">
                  <h3 className="text-base leading-snug font-bold text-foreground transition-colors group-hover:text-brand sm:text-lg">
                    {block.title}
                  </h3>
                </Link>
              ) : (
                <h3 className="text-base leading-snug font-bold text-foreground sm:text-lg">
                  {block.title}
                </h3>
              )}
              {block.subtitle ? (
                <p className="max-w-2xl text-base leading-relaxed font-normal text-muted-foreground sm:text-lg">
                  {block.subtitle}
                </p>
              ) : null}
            </div>

            {block.banners.length > 0 ? (
              <HomePromoBannerStrip banners={block.banners} className="mb-6 sm:mb-8" />
            ) : null}

            {block.products.length > 0 ? (
              <>
                {block.linkUrl ? (
                  <div className="mb-3 flex justify-end sm:mb-4">
                    <Link
                      href={block.linkUrl}
                      className="shrink-0 text-sm font-semibold text-neutral-700 transition hover:text-neutral-900"
                    >
                      View All
                    </Link>
                  </div>
                ) : null}
                <HorizontalScrollRow
                  gapClass="gap-3 sm:gap-4"
                  fillRow={block.products.length <= 6}
                  itemsPerSlide={6}
                >
                  {block.products.length <= 6 ? (
                    <>
                      {block.products.map((p) => (
                        <div
                          key={`${p.productId}-${p.variantId}`}
                          className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}
                        >
                          <HomeProductTile product={p} layout="fluidRow" compact />
                        </div>
                      ))}
                      {Array.from({ length: 6 - block.products.length }, (_, i) => (
                        <div
                          key={`pad-${blockIndex}-${i}`}
                          className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}
                          aria-hidden
                        />
                      ))}
                    </>
                  ) : (
                    block.products.map((p) => (
                      <div
                        key={`${p.productId}-${p.variantId}`}
                        className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}
                      >
                        <HomeProductTile product={p} layout="promoRow" className="h-full" compact />
                      </div>
                    ))
                  )}
                </HorizontalScrollRow>
              </>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
