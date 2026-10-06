import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Suspense } from "react";

import { CatalogLoading } from "@/components/storefront/catalog-loading";
import { CatalogPage, type Crumb } from "@/components/storefront/catalog-page";
import { parseCatalogParams, type RawSearchParams } from "@/lib/validations/catalog";
import { findCategory } from "@/server/queries/reference";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await findCategory(slug);
  if (!found) return { title: "Kategori tidak ditemukan" };
  const name = found.parent
    ? `${found.node.name} ${found.parent.name.toLowerCase()}`
    : found.node.name;
  return {
    title: name,
    description: `Belanja ${name.toLowerCase()} di NZO Industries. Cek kecocokan dengan kendaraanmu sebelum membeli.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const found = await findCategory(slug);
  if (!found || slug === "belum-dikategorikan") notFound();

  const crumbs: Crumb[] = [
    { label: "Beranda", href: "/" },
    { label: "Semua part", href: "/products" },
  ];
  if (found.parent)
    crumbs.push({ label: found.parent.name, href: `/categories/${found.parent.slug}` });
  crumbs.push({ label: found.node.name });

  // Validasi (notFound) terjadi sebelum Suspense supaya status 404 benar.
  return (
    <Suspense fallback={<CatalogLoading />}>
      <CatalogPage
        title={found.parent ? `${found.node.name} · ${found.parent.name}` : found.node.name}
        breadcrumbs={crumbs}
        basePath={`/categories/${slug}`}
        params={parseCatalogParams(await searchParams)}
        scope={{ categorySlug: slug }}
      />
    </Suspense>
  );
}
