import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { fetchSearchResults } from "@/lib/data/search-page";
import { BrandStoreProductGrid } from "@/components/store/brand-store-product-grid";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q?.trim() ?? "";
  return {
    title: q ? `"${q}" · Pencarian` : "Pencarian",
    description: q
      ? `Hasil pencarian untuk "${q}" di NZO Industries.`
      : "Cari produk di NZO Industries.",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim() ?? "";
  if (q.length < 2) redirect("/products");

  const result = await fetchSearchResults(q);
  const isEmpty =
    result.categories.length === 0 &&
    result.brands.length === 0 &&
    result.looseProducts.length === 0;

  const hasMultipleSections =
    [
      result.categories.length > 0,
      result.brands.length > 0,
      result.looseProducts.length > 0,
    ].filter(Boolean).length > 1;

  return (
    <div className="mx-auto max-w-[1440px] space-y-12 px-4 py-8 sm:px-6 lg:px-24">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
          Pencarian
        </p>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold text-foreground uppercase sm:text-[34px]">
          &ldquo;{result.query}&rdquo;
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {isEmpty ? "Tidak ada produk ditemukan" : `${result.totalCount} produk ditemukan`}
        </p>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="space-y-4 py-16 text-center">
          <p className="text-[15px] text-muted-foreground">
            Coba kata kunci lain, atau lihat semua produk kami.
          </p>
          <Button asChild variant="dark" size="sm" className="text-xs font-bold uppercase">
            <Link href="/products">Lihat Semua Produk</Link>
          </Button>
        </div>
      )}

      {/* Category sections */}
      {result.categories.map((cat) => (
        <section key={cat.id} className="space-y-8">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
              Kategori
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold text-foreground uppercase">{cat.name}</h2>
          </div>
          <div className="space-y-8">
            {cat.groups.map((group) => (
              <div key={group.brandId} className="space-y-3">
                <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  {group.brandName}
                </p>
                <BrandStoreProductGrid products={group.products} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Brand sections */}
      {result.brands.map((brand) => (
        <section key={brand.id} className="space-y-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
              Brand
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold text-foreground uppercase">
              {brand.name}
            </h2>
          </div>
          <BrandStoreProductGrid products={brand.products} />
        </section>
      ))}

      {/* Loose products */}
      {result.looseProducts.length > 0 && (
        <section className="space-y-4">
          {hasMultipleSections && (
            <div>
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                Produk
              </p>
              <h2 className="mt-0.5 text-2xl font-semibold text-foreground uppercase">Lainnya</h2>
            </div>
          )}
          <BrandStoreProductGrid products={result.looseProducts} />
        </section>
      )}
    </div>
  );
}
