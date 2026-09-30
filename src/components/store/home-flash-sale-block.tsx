import Link from "next/link";

import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";

import { HOME_HERO_FLASH_SALE_CAMPAIGN_NAME } from "@/lib/constants/home-flash-sale";
import { HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import type { FlashSaleBlockData } from "@/lib/data/home-storefront";
import { getFlashSaleLink } from "@/lib/promo-links";

type HomeFlashSaleBlockProps = {
  /** Data kampanye; beranda memuat kampanye `HOME_HERO_FLASH_SALE_CAMPAIGN_NAME` via `fetchFlashSaleBlockByCampaignName`. */
  block: FlashSaleBlockData | null;
  /** Jika true dan data kosong, tidak me-render apa pun */
  hideWhenEmpty?: boolean;
};

export function HomeFlashSaleBlock({ block, hideWhenEmpty }: HomeFlashSaleBlockProps) {
  if (!block || block.products.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <section className="border-b border-neutral-200 bg-background py-6 sm:py-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Flash sale{" "}
            <span className="font-medium text-foreground">
              {HOME_HERO_FLASH_SALE_CAMPAIGN_NAME}
            </span>{" "}
            tidak ditemukan atau belum ada produk. Pastikan di Admin → Flash sale ada kampanye
            dengan nama persis tersebut (atau dengan tanda seru di akhir), kampanye aktif, dan
            produk flash sale sudah ditambahkan.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:items-end">
          <Link href={getFlashSaleLink(block.saleId)} className="group inline-block">
            <h3 className="text-base leading-snug font-bold text-foreground transition-colors group-hover:text-brand sm:text-lg">
              {block.saleName}
            </h3>
          </Link>
          <Link
            href={getFlashSaleLink(block.saleId)}
            className="shrink-0 text-sm font-semibold text-neutral-700 transition hover:text-neutral-900"
          >
            View All
          </Link>
        </div>

        {block.subtitle ? (
          <p className="mb-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mb-6 sm:text-lg">
            {block.subtitle}
          </p>
        ) : null}
        <HorizontalScrollRow
          gapClass="gap-3 sm:gap-4"
          fillRow={block.products.length > 0 && block.products.length <= 6}
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
              {Array.from({ length: Math.max(0, 6 - block.products.length) }, (_, i) => (
                <div
                  key={`flash-row-pad-${i}`}
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
      </div>
    </section>
  );
}
