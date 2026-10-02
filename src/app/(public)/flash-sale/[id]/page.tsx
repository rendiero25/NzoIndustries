import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { FlashSaleCountdown } from "@/components/store/flash-sale-countdown";
import { PromoProductsSection } from "@/components/store/promo-products-section";
import { fetchFlashSalePageData } from "@/lib/data/promo-pages";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchFlashSalePageData(id);
  if (!data) return { title: "Flash Sale" };
  return {
    title: data.name,
    description: data.subtitle ?? `Produk flash sale ${data.name} — harga spesial terbatas.`,
  };
}

export default async function FlashSalePage({ params }: Props) {
  const { id } = await params;
  const data = await fetchFlashSalePageData(id);
  if (!data) notFound();

  const isExpired = data.endsAt ? new Date(data.endsAt) < new Date() : false;

  return (
    <>
      <nav aria-label="Breadcrumb" className="border-b border-border bg-white py-3">
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
              <span className="text-steel-200" aria-hidden>
                /
              </span>
              <span className="font-medium text-foreground" aria-current="page">
                {data.name}
              </span>
            </li>
          </ol>
        </div>
      </nav>

      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-24">
        <div className="mb-8 flex flex-col items-center space-y-3 text-center">
          <h1 className="text-lg leading-snug font-black text-foreground sm:text-xl md:text-2xl">
            {data.name}
          </h1>
          {data.subtitle ? (
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {data.subtitle}
            </p>
          ) : null}
          {data.endsAt ? (
            isExpired ? (
              <p className="text-sm text-muted-foreground">Flash sale telah berakhir.</p>
            ) : (
              <FlashSaleCountdown endsAt={data.endsAt} />
            )
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
