import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PromoProductsSection } from "@/components/store/promo-products-section";
import { fetchPromotionPageData } from "@/lib/data/promo-pages";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPromotionPageData(id);
  if (!data) return { title: "Promosi" };
  return {
    title: data.title,
    description: data.subtitle ?? `Lihat semua produk dalam promosi ${data.title}.`,
  };
}

export default async function PromoPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchPromotionPageData(id);
  if (!data) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className="border-b border-[#e0e0e0] bg-white py-3">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <ol className="scrollbar-none flex min-w-0 items-center gap-2 overflow-x-auto py-1 text-[13px]">
            <li className="flex items-center gap-2">
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#c8c8cc]" aria-hidden>
                /
              </span>
              <span className="font-medium text-foreground" aria-current="page">
                {data.title}
              </span>
            </li>
          </ol>
        </div>
      </nav>

      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-24">
        <div className="mb-8 space-y-3 text-center">
          <h1 className="text-lg leading-snug font-black text-foreground sm:text-xl md:text-2xl">
            {data.title}
          </h1>
          {data.subtitle ? (
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {data.subtitle}
            </p>
          ) : null}
        </div>

        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada produk.</p>
        ) : (
          <PromoProductsSection products={data.products} />
        )}
      </main>
    </>
  );
}
