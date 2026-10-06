import type { Metadata } from "next";

import { Suspense } from "react";

import { CatalogLoading } from "@/components/storefront/catalog-loading";
import { CatalogPage } from "@/components/storefront/catalog-page";
import { parseCatalogParams, type RawSearchParams } from "@/lib/validations/catalog";

export const metadata: Metadata = {
  title: "Semua part",
  description:
    "Sparepart dan aksesoris motor & mobil. Saring berdasarkan kendaraan, kategori, brand, dan harga.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parseCatalogParams(await searchParams);
  return (
    <Suspense fallback={<CatalogLoading />}>
      <CatalogPage
        title="Semua part"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Semua part" }]}
        basePath="/products"
        params={params}
      />
    </Suspense>
  );
}
