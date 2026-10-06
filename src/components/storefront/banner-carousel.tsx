"use client";

import { CldImage } from "next-cloudinary";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { Banner } from "@/server/queries/home";

/** Banner promo dari admin (§5 no. 3): 21:9 desktop, 4:5 mobile. Tidak dirender bila kosong. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!banners.length || !cloudName) return null;

  return (
    <section aria-label="Promo" className="nzo-container pt-8">
      <Carousel opts={{ loop: banners.length > 1 }}>
        <CarouselContent>
          {banners.map((b, i) => {
            const image = (
              <div className="relative overflow-hidden rounded-xl bg-steel-50">
                <picture>
                  <CldImage
                    src={b.mobileImagePublicId ?? b.imagePublicId}
                    alt={b.title ?? "Promo NZO Industries"}
                    width={800}
                    height={1000}
                    crop="fill"
                    sizes="100vw"
                    priority={i === 0}
                    className="aspect-[4/5] w-full object-cover md:hidden"
                  />
                  <CldImage
                    src={b.imagePublicId}
                    alt={b.title ?? "Promo NZO Industries"}
                    width={2100}
                    height={900}
                    crop="fill"
                    sizes="(min-width: 1280px) 1280px, 100vw"
                    priority={i === 0}
                    className="hidden aspect-[21/9] w-full object-cover md:block"
                  />
                </picture>
              </div>
            );
            return (
              <CarouselItem key={b.id}>
                {b.href ? (
                  <Link href={b.href} aria-label={b.title ?? "Lihat promo"}>
                    {image}
                  </Link>
                ) : (
                  image
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {banners.length > 1 ? (
          <>
            <CarouselPrevious className="left-3 max-md:hidden" />
            <CarouselNext className="right-3 max-md:hidden" />
          </>
        ) : null}
      </Carousel>
    </section>
  );
}
