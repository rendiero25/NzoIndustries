import { HomeProductTile } from "@/components/store/home-product-tile";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

export function BrandStoreProductGrid({
  products,
  brandName,
}: {
  products: HomeShelfProduct[];
  brandName?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[#7a7a7a]">
        Tidak ada produk yang cocok dengan filter.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
      {products.map((p) => (
        <div key={`${p.productId}-${p.variantId}`} className="min-w-0">
          <HomeProductTile
            product={p}
            layout="promoRow"
            className="h-full overflow-hidden rounded-[18px] bg-white"
            compact
            brandLabel={brandName}
          />
        </div>
      ))}
    </div>
  );
}
