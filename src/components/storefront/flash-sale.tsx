import { Zap } from "lucide-react";
import Link from "next/link";

import { Price } from "@/components/catalog/price";
import { ProductImage } from "@/components/catalog/product-image";
import type { ActiveFlashSale } from "@/server/queries/home";

import { Countdown } from "./countdown";

/** Flash sale aktif + countdown (beranda & /promo). Disembunyikan bila tidak ada. */
export function FlashSaleSection({
  sale,
  showAllLink = true,
}: {
  sale: ActiveFlashSale;
  showAllLink?: boolean;
}) {
  return (
    <section
      aria-labelledby="flash-sale"
      className="rounded-xl bg-brand-black p-5 text-white md:p-8"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-signal">
            <Zap className="size-4 fill-signal" aria-hidden />
            Flash sale
          </p>
          <h2 id="flash-sale" className="text-2xl text-white">
            {sale.name}
          </h2>
          {sale.subtitle ? <p className="text-steel-200">{sale.subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-4">
          <Countdown endsAt={sale.endsAt} />
          {showAllLink ? (
            <Link
              href="/promo"
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              Lihat semua
            </Link>
          ) : null}
        </div>
      </div>
      <ul className="scrollbar-none -mx-5 flex snap-x gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:px-0 lg:grid-cols-6">
        {sale.items.map((item) => {
          const soldPct = item.quota
            ? Math.min(100, Math.round((item.sold / item.quota) * 100))
            : null;
          return (
            <li key={item.productId} className="w-40 shrink-0 snap-start md:w-auto">
              <Link
                href={`/products/${item.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg bg-white text-foreground"
              >
                <div className="relative aspect-square bg-steel-50">
                  <ProductImage
                    publicId={item.imagePublicId}
                    alt={item.name}
                    sizes="(min-width: 1024px) 16vw, 40vw"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                  <Price price={item.salePrice} compareAt={item.normalPrice} className="mt-auto" />
                  {soldPct !== null ? (
                    <div className="flex flex-col gap-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-steel-200">
                        <div
                          className="h-full rounded-full bg-signal"
                          style={{ width: `${soldPct}%` }}
                        />
                      </div>
                      <span className="text-caption text-muted-foreground">{soldPct}% terjual</span>
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
