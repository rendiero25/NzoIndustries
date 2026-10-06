import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Suspense } from "react";

import { CatalogLoading } from "@/components/storefront/catalog-loading";
import { CatalogPage } from "@/components/storefront/catalog-page";
import { parseCatalogParams, type RawSearchParams } from "@/lib/validations/catalog";
import { getBrands } from "@/server/queries/reference";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

async function findBrand(slug: string) {
  return (await getBrands()).find((b) => b.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) return { title: "Brand tidak ditemukan" };
  return {
    title: `Produk ${brand.name}`,
    description: `Sparepart dan aksesoris ${brand.name} di NZO Industries.`,
    alternates: { canonical: `/brands/${slug}` },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const brand = await findBrand(slug);
  if (!brand) notFound();

  // Validasi (notFound) terjadi sebelum Suspense supaya status 404 benar.
  return (
    <Suspense fallback={<CatalogLoading />}>
      <CatalogPage
        title={brand.name}
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Brand", href: "/brands" },
          { label: brand.name },
        ]}
        basePath={`/brands/${slug}`}
        params={parseCatalogParams(await searchParams)}
        scope={{ brandSlug: slug }}
      />
    </Suspense>
  );
}
