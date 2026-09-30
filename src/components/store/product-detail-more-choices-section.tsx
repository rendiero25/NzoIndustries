import { HomeProductTile } from "@/components/store/home-product-tile";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type ProductDetailMoreChoicesSectionProps = {
  products: HomeShelfProduct[];
};

export function ProductDetailMoreChoicesSection({
  products,
}: ProductDetailMoreChoicesSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-white pb-14 md:py-10" aria-labelledby="more-choices-heading">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
        <h2
          id="more-choices-heading"
          className="mb-10 text-[clamp(1.25rem,3vw,1.5rem)] font-semibold text-[#1d1d1f]"
        >
          Mungkin kamu suka ini!
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 md:gap-5">
          {products.map((p) => (
            <div key={`${p.productId}-${p.variantId}`} className="min-w-0">
              <HomeProductTile
                product={p}
                layout="promoRow"
                className="h-full overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
