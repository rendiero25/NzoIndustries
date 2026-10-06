import type { Metadata } from "next";

import { CatalogPage } from "@/components/storefront/catalog-page";
import { parseCatalogParams, type RawSearchParams } from "@/lib/validations/catalog";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseCatalogParams(await searchParams);
  return {
    title: q ? `Hasil pencarian "${q}"` : "Cari part",
    // Halaman hasil pencarian tidak diindeks (konten tipis/duplikat).
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = parseCatalogParams(await searchParams);
  return (
    <CatalogPage
      title={params.q ? `Hasil untuk “${params.q}”` : "Cari part"}
      description={params.q ? undefined : "Ketik nama part, kode part, atau SKU di kolom pencarian"}
      breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Pencarian" }]}
      basePath="/search"
      params={params}
    />
  );
}
