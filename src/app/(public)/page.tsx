import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductGridSkeleton } from "@/components/shared/skeletons";
import { BannerCarousel } from "@/components/storefront/banner-carousel";
import { FlashSaleSection } from "@/components/storefront/flash-sale";
import { HomeHero } from "@/components/storefront/home-hero";
import { HomeProductTabs } from "@/components/storefront/home-product-tabs";
import {
  BrandMarquee,
  CategoryChips,
  ReviewsSection,
  StoreStatsSection,
} from "@/components/storefront/home-sections";
import { ProductGrid } from "@/components/storefront/product-grid";
import { getWishlistIds } from "@/server/actions/wishlist";
import { getPublicReviews, listProductCards } from "@/server/queries/catalog";
import { getActiveFlashSale, getBanners } from "@/server/queries/home";
import {
  getBrands,
  getCategoryTree,
  getStoreStats,
  getVehicleCatalog,
} from "@/server/queries/reference";
import { getActiveVehicle } from "@/server/queries/vehicle";

export const metadata: Metadata = {
  title: { absolute: "NZO Industries — Sparepart & aksesoris motor dan mobil" },
  description:
    "Sparepart dan aksesoris motor & mobil: genuine parts dan aftermarket pilihan. Pilih kendaraanmu, cek kecocokan, kirim ke seluruh Indonesia.",
  alternates: { canonical: "/" },
};

/** Beranda (design-system §5): urutan section tetap, tiap section mandiri. */
export default async function HomePage() {
  const [vehicles, vehicle, tree] = await Promise.all([
    getVehicleCatalog().catch(() => ({ makes: [], models: [] })),
    getActiveVehicle().catch(() => null),
    getCategoryTree().catch(() => []),
  ]);

  return (
    <>
      <HomeHero
        makes={vehicles.makes}
        models={vehicles.models}
        active={
          vehicle ? { modelId: vehicle.modelId, year: vehicle.year, label: vehicle.label } : null
        }
      />
      <CategoryChips tree={tree} />
      <Suspense fallback={null}>
        <BannersBlock />
      </Suspense>
      <Suspense fallback={null}>
        <FlashSaleBlock />
      </Suspense>
      <Suspense
        fallback={
          <div className="nzo-container py-12 md:py-16">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <ProductTabsBlock />
      </Suspense>
      <Suspense fallback={null}>
        <BrandsBlock />
      </Suspense>
      <Suspense fallback={null}>
        <StatsBlock />
      </Suspense>
      <Suspense fallback={null}>
        <ReviewsBlock />
      </Suspense>
    </>
  );
}

async function BannersBlock() {
  const banners = await getBanners("hero").catch(() => []);
  return <BannerCarousel banners={banners} />;
}

async function FlashSaleBlock() {
  const sale = await getActiveFlashSale().catch(() => null);
  if (!sale) return null;
  return (
    <div className="nzo-container pt-10">
      <FlashSaleSection sale={sale} />
    </div>
  );
}

async function ProductTabsBlock() {
  const vehicle = await getActiveVehicle().catch(() => null);
  const [bestseller, newest, wishlist] = await Promise.all([
    listProductCards({ sort: "bestseller", limit: 8 }, vehicle),
    listProductCards({ sort: "newest", limit: 8 }, vehicle),
    getWishlistIds(),
  ]);
  const saved = new Set(wishlist);
  return (
    <HomeProductTabs
      bestseller={<ProductGrid items={bestseller} wishlistIds={saved} priorityCount={0} />}
      newest={<ProductGrid items={newest} wishlistIds={saved} priorityCount={0} />}
    />
  );
}

async function BrandsBlock() {
  const brands = await getBrands().catch(() => []);
  return <BrandMarquee brands={brands} />;
}

async function StatsBlock() {
  const stats = await getStoreStats().catch(() => null);
  return stats ? <StoreStatsSection stats={stats} /> : null;
}

async function ReviewsBlock() {
  const reviews = await getPublicReviews(null, 6).catch(() => []);
  return <ReviewsSection reviews={reviews} />;
}
