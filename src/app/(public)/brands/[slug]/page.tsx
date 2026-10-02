import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandStoreCatalogFilters } from "@/components/store/brand-store-catalog-filters";
import { BrandStorePagination } from "@/components/store/brand-store-pagination";
import { BrandStoreProductGrid } from "@/components/store/brand-store-product-grid";
import { HomePromoBannerStrip } from "@/components/store/home-promo-banner-strip";
import {
  fetchBrandBySlugForStore,
  fetchBrandCategoryFilters,
  fetchBrandProductsPage,
  fetchPreFooterBanners,
  type BrandStorePublicBrand,
} from "@/lib/data/brand-store-page";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ slug: string }>;
type SearchParams = Promise<{
  page?: string;
  category?: string;
  condition?: string;
  discount?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  sort?: string;
}>;

function BrandBreadcrumbs({ brand }: { brand: BrandStorePublicBrand }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[14px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="transition hover:text-foreground">
            Home
          </Link>
        </li>
        <li aria-hidden className="text-steel-200">
          /
        </li>
        <li>
          <Link href="/brands" className="transition hover:text-foreground">
            Brand
          </Link>
        </li>
        <li aria-hidden className="text-steel-200">
          /
        </li>
        <li
          className="max-w-[min(100%,28rem)] truncate font-medium text-foreground"
          aria-current="page"
        >
          {brand.name}
        </li>
      </ol>
    </nav>
  );
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrandBySlugForStore(slug);
  if (!brand) return { title: "Brand tidak ditemukan" };
  return {
    title: `${brand.name} — Produk`,
    description: `Katalog produk ${brand.name} di NZO Industries.`,
  };
}

export default async function BrandProductListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const categoryId = sp.category ?? "";
  const condition = sp.condition?.trim() ?? "";
  const discountOnly = sp.discount === "1";
  const minPrice = sp.minPrice?.trim() ?? "";
  const maxPrice = sp.maxPrice?.trim() ?? "";
  const rating = sp.rating?.trim() ?? "";
  const sort = sp.sort ?? "latest";

  const brand = await fetchBrandBySlugForStore(slug);
  if (!brand) notFound();

  const [categories, listResult, preFooterBanners] = await Promise.all([
    fetchBrandCategoryFilters(brand.id),
    fetchBrandProductsPage({
      brandId: brand.id,
      page,
      categoryId: categoryId || null,
      condition: condition || null,
      discountOnly,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      minRating: rating ? Number(rating) : null,
      sort,
    }),
    fetchPreFooterBanners(),
  ]);

  const basePath = `/brands/${encodeURIComponent(brand.slug)}`;

  return (
    <div className="bg-white text-foreground">
      <div className="border-b border-border py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <BrandBreadcrumbs brand={brand} />
        </div>
      </div>

      <section className="bg-white py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <Suspense
            fallback={
              <div
                className="mb-8 h-11 w-full max-w-xl animate-pulse rounded-full bg-muted"
                aria-hidden
              />
            }
          >
            <BrandStoreCatalogFilters categories={categories} totalCount={listResult.totalCount} />
          </Suspense>

          <div className="mt-8">
            <BrandStoreProductGrid products={listResult.products} brandName={brand.name} />
          </div>

          <BrandStorePagination
            basePath={basePath}
            currentPage={page}
            totalCount={listResult.totalCount}
            categoryId={categoryId}
            condition={condition}
            discount={discountOnly}
            minPrice={minPrice}
            maxPrice={maxPrice}
            rating={rating}
            sort={sort}
          />
        </div>
      </section>

      {preFooterBanners.length > 0 ? (
        <section className="bg-muted py-10">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
            <HomePromoBannerStrip banners={preFooterBanners} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
