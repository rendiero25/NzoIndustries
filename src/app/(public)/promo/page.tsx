import type { Metadata } from "next";

import { CatalogPage } from "@/components/storefront/catalog-page";
import { FlashSaleSection } from "@/components/storefront/flash-sale";
import { parseCatalogParams, type RawSearchParams } from "@/lib/validations/catalog";
import { getActiveFlashSale } from "@/server/queries/home";

export const metadata: Metadata = {
  title: "Promo",
  description: "Flash sale dan part dengan harga diskon di NZO Industries.",
  alternates: { canonical: "/promo" },
};

export default async function PromoPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [params, sale] = await Promise.all([
    searchParams.then(parseCatalogParams),
    getActiveFlashSale().catch(() => null),
  ]);
  return (
    <CatalogPage
      title="Promo"
      description="Part dengan harga coret"
      breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Promo" }]}
      basePath="/promo"
      params={params}
      scope={{ onSale: true }}
    >
      {sale ? (
        <div className="mb-8">
          <FlashSaleSection sale={sale} showAllLink={false} />
        </div>
      ) : null}
    </CatalogPage>
  );
}
