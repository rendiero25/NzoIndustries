import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductsCatalogFilters } from "@/components/store/products-catalog-filters";
import { ProductsCatalogGrid } from "@/components/store/products-catalog-grid";
import { ProductsCatalogPagination } from "@/components/store/products-catalog-pagination";
import { fetchBrandBySlugForStore } from "@/lib/data/brand-store-page";
import {
  fetchActiveCategoriesForProductIndex,
  fetchCategoryBySlugForStore,
} from "@/lib/data/category-store-page";
import {
  fetchActiveBrandsForCatalog,
  fetchProductsCatalogPage,
} from "@/lib/data/products-catalog-page";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  category?: string;
  brand?: string;
  condition?: string;
  discount?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  page?: string;
}>;

function parseCategorySlugs(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const categorySlugs = parseCategorySlugs(sp.category);
  const brandSlug = sp.brand?.trim();

  if (categorySlugs.length > 0) {
    const cats = (
      await Promise.all(categorySlugs.map((slug) => fetchCategoryBySlugForStore(slug)))
    ).filter((c): c is NonNullable<typeof c> => c !== null);
    if (cats.length > 0) {
      const name = cats.map((c) => c.name).join(" & ");
      return {
        title: `${name}`,
        description: `Telusuri produk ${name} di NZO Industries.`,
      };
    }
  }
  if (brandSlug) {
    const brand = await fetchBrandBySlugForStore(brandSlug);
    if (brand) {
      return {
        title: `${brand.name}`,
        description: `Telusuri produk ${brand.name} di NZO Industries.`,
      };
    }
  }
  return {
    title: "Semua Produk",
    description:
      "Telusuri katalog NZO Industries: filter kategori, brand, harga, dan rating, lalu urutkan sesuai kebutuhanmu.",
  };
}

export default async function ProductsHubPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const categorySlugs = parseCategorySlugs(sp.category);
  const brandSlug = sp.brand?.trim() ?? "";
  const condition = sp.condition?.trim() ?? "";
  const discountOnly = sp.discount === "1";
  const sort = sp.sort?.trim() ?? "latest";
  const minPrice = sp.minPrice?.trim() ?? "";
  const maxPrice = sp.maxPrice?.trim() ?? "";
  const rating = sp.rating?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [categoryResults, brand] = await Promise.all([
    Promise.all(categorySlugs.map((slug) => fetchCategoryBySlugForStore(slug))),
    brandSlug ? fetchBrandBySlugForStore(brandSlug) : Promise.resolve(null),
  ]);
  const resolvedCategories = categoryResults.filter((c): c is NonNullable<typeof c> => c !== null);

  if (categorySlugs.length > 0 && resolvedCategories.length === 0) notFound();
  if (brandSlug && !brand) notFound();

  const [categories, brands, listResult] = await Promise.all([
    fetchActiveCategoriesForProductIndex(),
    fetchActiveBrandsForCatalog(),
    fetchProductsCatalogPage({
      page,
      categoryId: resolvedCategories.length > 0 ? resolvedCategories.map((c) => c.id) : null,
      brandId: brand?.id ?? null,
      condition: condition || null,
      discountOnly,
      sort,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      minRating: rating ? Number(rating) : null,
    }),
  ]);

  const hasActiveFilters = Boolean(
    categorySlugs.length ||
    brandSlug ||
    condition ||
    discountOnly ||
    minPrice ||
    maxPrice ||
    rating,
  );
  const title =
    resolvedCategories.length > 0
      ? resolvedCategories.map((c) => c.name).join(" & ")
      : (brand?.name ?? "Semua Produk");
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(resolvedCategories.length > 0 || brand ? [{ label: "Produk", href: "/products" }] : []),
    { label: title },
  ];

  return (
    <div className="bg-white text-foreground">
      <nav aria-label="Breadcrumb" className="border-b border-border bg-white py-3">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <ol className="scrollbar-none flex min-w-0 items-center gap-2 overflow-x-auto py-1 text-[13px]">
            {breadcrumbItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-steel-200" aria-hidden>
                    /
                  </span>
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground" aria-current="page">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="mb-6 space-y-1">
            <h1 className="text-xl leading-tight font-black text-foreground sm:text-2xl md:text-[28px]">
              {title}
            </h1>
          </div>

          <Suspense
            fallback={
              <div
                className="mb-6 h-11 w-full max-w-xl animate-pulse rounded-full bg-muted"
                aria-hidden
              />
            }
          >
            <ProductsCatalogFilters
              categories={categories}
              brands={brands}
              totalCount={listResult.totalCount}
            />
          </Suspense>

          <div className="mt-6">
            <ProductsCatalogGrid
              products={listResult.products}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          <ProductsCatalogPagination
            currentPage={page}
            totalCount={listResult.totalCount}
            category={categorySlugs.join(",")}
            brand={brandSlug}
            condition={condition}
            discount={discountOnly}
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            rating={rating}
          />
        </div>
      </section>
    </div>
  );
}
