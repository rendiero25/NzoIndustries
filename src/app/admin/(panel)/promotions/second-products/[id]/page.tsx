import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PromotionForm } from "../../_components/promotion-form";
import { PromotionBannerSection } from "../../_components/promotion-banner-section";
import { fetchSelectorData, fetchPromotionWithAssociations } from "../../_lib/fetch-selector-data";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { promo } = await fetchPromotionWithAssociations(id);
  return { title: `${promo?.title ?? "Promosi"} · Admin` };
}

const BACK_PATH = "/admin/promotions/second-products";

export default async function SecondProductsEditPage({ params }: { params: Params }) {
  const { id } = await params;

  const [{ promo, productIds, brandIds }, { products, brands, categories }] = await Promise.all([
    fetchPromotionWithAssociations(id),
    fetchSelectorData(),
  ]);

  if (!promo || promo.type !== "second_products") notFound();

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <Link
        href={BACK_PATH}
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar
      </Link>

      <div>
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">{promo.title}</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Template: Produk Second Terbaik
        </p>
      </div>

      <PromotionForm
        type="second_products"
        backPath={BACK_PATH}
        redirectPath={BACK_PATH}
        initialData={{
          id,
          title: promo.title,
          subtitle: promo.subtitle,
          is_active: promo.is_active ?? false,
          max_items: promo.max_items ?? 10,
          selection_mode: (promo.selection_mode ?? "manual") as "manual" | "brand",
          config: (promo.config ?? {}) as Record<string, unknown>,
          product_ids: productIds,
          brand_ids: brandIds,
        }}
        products={products}
        brands={brands}
        categories={categories}
        bannerSection={<PromotionBannerSection template="second_products" />}
      />
    </div>
  );
}
