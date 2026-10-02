import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PromotionForm } from "../../_components/promotion-form";
import { fetchSelectorData } from "../../_lib/fetch-selector-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buat Rekomendasi Produk — Admin NZO Industries" };

const BACK_PATH = "/admin/promotions/featured-products";

export default async function FeaturedProductsNewPage() {
  const { products, brands, categories } = await fetchSelectorData();

  return (
    <div className="mx-auto w-full space-y-8 p-6 lg:p-8">
      <Link
        href={BACK_PATH}
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar
      </Link>

      <div>
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">
          Buat Rekomendasi Produk
        </h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Template: Rekomendasi Produk · pilih produk atau brand yang ingin ditonjolkan
        </p>
      </div>

      <PromotionForm
        type="featured_products"
        backPath={BACK_PATH}
        redirectPath={BACK_PATH}
        products={products}
        brands={brands}
        categories={categories}
      />
    </div>
  );
}
