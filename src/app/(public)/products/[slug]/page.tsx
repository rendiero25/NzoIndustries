import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailClient } from "@/components/store/product-detail-client";
import {
  fetchProductDetailBySlug,
  fetchProductReviewsForStore,
  fetchRatingHistogram,
  fetchSameCategoryProducts,
} from "@/lib/data/product-detail-page";
import { ProductDetailMoreChoicesSection } from "@/components/store/product-detail-more-choices-section";
import type { ProductDetailPublic } from "@/lib/types/product-detail";

// ISR: revalidate every 60s per CLAUDE.md — wishlist state is fetched client-side
export const revalidate = 60;

type PageParams = Promise<{ slug: string }>;

function ProductBreadcrumbs({ product }: { product: ProductDetailPublic }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[14px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="transition hover:text-foreground">
            Home
          </Link>
        </li>
        {product.brand ? (
          <>
            <li aria-hidden className="text-steel-200">
              /
            </li>
            <li>
              <Link
                href={`/brands/${encodeURIComponent(product.brand.slug)}`}
                className="transition hover:text-foreground"
              >
                {product.brand.name}
              </Link>
            </li>
          </>
        ) : null}
        {product.category ? (
          <>
            <li aria-hidden className="text-steel-200">
              /
            </li>
            <li>
              <Link
                href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                className="transition hover:text-foreground"
              >
                {product.category.name}
              </Link>
            </li>
          </>
        ) : null}
        <li aria-hidden className="text-steel-200">
          /
        </li>
        <li
          className="max-w-[min(100%,28rem)] truncate font-medium text-foreground"
          aria-current="page"
        >
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductDetailBySlug(slug);
  if (!product) {
    return { title: "Produk tidak ditemukan" };
  }
  const desc = product.description?.replace(/\s+/g, " ").trim().slice(0, 155);
  return {
    title: `${product.name}`,
    description: desc || `Beli ${product.name} di NZO Industries.`,
  };
}

export default async function ProductDetailPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const product = await fetchProductDetailBySlug(slug);
  if (!product) notFound();

  const [reviews, histogram, moreChoices] = await Promise.all([
    fetchProductReviewsForStore(product.id, 40),
    fetchRatingHistogram(product.id),
    fetchSameCategoryProducts({
      currentProductId: product.id,
      categoryId: product.categoryId,
      limit: 5,
    }),
  ]);

  // Wishlist state is fetched client-side via /api/wishlist/check so this page
  // can stay ISR-cached. No auth cookie read here = no force-dynamic needed.
  const siteBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="bg-white">
      <div className="border-b border-border py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <ProductBreadcrumbs product={product} />
        </div>
      </div>
      <ProductDetailClient
        product={product}
        reviews={reviews}
        histogram={histogram}
        siteBaseUrl={siteBaseUrl}
      />
      <ProductDetailMoreChoicesSection products={moreChoices} />
    </div>
  );
}
