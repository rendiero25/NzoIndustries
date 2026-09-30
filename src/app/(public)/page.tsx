import { Suspense } from "react";
import type { Metadata } from "next";

import { HomeDynamicPromoBlocksFetcher } from "@/components/store/home-dynamic-promo-blocks";
import { HomeFlashSaleBlock } from "@/components/store/home-flash-sale-block";
import { HomeLatestProductsSection } from "@/components/store/home-latest-products-section";
import { HomeMainHero } from "@/components/store/home-main-hero";
import {
  fetchLatestHomeProducts,
  fetchMainHeroBanners,
  fetchPrimaryHomeFlashSaleBlock,
} from "@/lib/data/home-storefront";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Toko tech & gadget terpercaya. Produk original bergaransi resmi. Pengiriman ke seluruh Indonesia.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const loaded = await Promise.all([
    fetchMainHeroBanners(),
    fetchPrimaryHomeFlashSaleBlock(),
    fetchLatestHomeProducts(18),
  ]).catch(() => null);

  if (loaded === null) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Gagal memuat beranda. Silakan muat ulang halaman.
        </p>
      </div>
    );
  }

  const [heroBanners, flashSaleBlock, latestProducts] = loaded;
  const excludeFlashSaleIds = flashSaleBlock?.saleId ? [flashSaleBlock.saleId] : [];

  return (
    <div className="bg-white">
      <HomeMainHero banners={heroBanners} />
      <HomeFlashSaleBlock block={flashSaleBlock} />
      <HomeLatestProductsSection products={latestProducts} />
      <Suspense>
        <HomeDynamicPromoBlocksFetcher excludeFlashSaleIds={excludeFlashSaleIds} />
      </Suspense>
    </div>
  );
}
