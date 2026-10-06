import type { Metadata } from "next";

import { ShopByBrandSection } from "@/components/store/shop-by-brand-section";
import { fetchShopBrands } from "@/lib/data/home-storefront";

export const metadata: Metadata = {
  title: "Authorized Brand",
  description:
    "Brand-brand tech terpercaya di NZO Industries — semua produk original bergaransi resmi, langsung dari distributor resmi di Indonesia.",
};

export const dynamic = "force-dynamic";

export default async function BrandsIndexPage() {
  const brands = await fetchShopBrands();

  return (
    <div className="bg-white">
      <ShopByBrandSection brands={brands} showSeeAllLink={false} />
    </div>
  );
}
