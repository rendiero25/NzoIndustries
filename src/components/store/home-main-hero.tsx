"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { CarouselDots } from "@/components/ui/carousel-dots";
import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import {
  STORE_BANNER_IMAGE_CLASS,
  STORE_BANNER_MEDIA_CLASS,
  STORE_BANNER_SURFACE_CLASS,
} from "@/lib/constants/store-banner";
import type { StoreBanner } from "@/lib/data/home-storefront";
import { cn } from "@/lib/utils";
const AUTO_MS = 6500;

type HomeMainHeroProps = {
  banners: StoreBanner[];
  hideNav?: boolean;
};

const HeroSlide = memo(function HeroSlide({
  banner,
  priority,
}: {
  banner: StoreBanner;
  priority: boolean;
}) {
  const inner = (
    <div className={cn(STORE_BANNER_MEDIA_CLASS, "h-[230px] sm:h-[390px]")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL banner dari admin bisa domain eksternal */}
      <img
        src={banner.image_url}
        alt={banner.title ?? ""}
        className={STORE_BANNER_IMAGE_CLASS}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </div>
  );

  if (banner.link_url) {
    return (
      <Link
        href={banner.link_url}
        className="block min-w-full shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {inner}
      </Link>
    );
  }

  return <div className="min-w-full shrink-0">{inner}</div>;
});

export function HomeMainHero({ banners, hideNav = false }: HomeMainHeroProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const n = banners.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (n <= 1 || isPaused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n, isPaused]);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsPaused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsPaused(false);
  }, []);

  if (n === 0) {
    return (
      <section className="border-b border-neutral-200 bg-neutral-900 py-16 text-center text-white">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <h1 className="sr-only">NZO Industries</h1>
          <p className="text-sm font-medium text-white/70">
            Belum ada banner utama. Atur di Admin → Promosi → Main Banner.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="group/hero relative mt-4"
      aria-roledescription="carousel"
      aria-label="Banner utama"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
        <h1 className="sr-only">NZO Industries — Toko Tech & Gadget</h1>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {n > 1 ? (banners[index]?.title ?? `Slide ${index + 1} dari ${n}`) : null}
        </div>
        <div
          className={`relative grid w-full shadow-[0_12px_24px_-18px_rgba(0,0,0,0.35)] ${STORE_BANNER_SURFACE_CLASS}`}
        >
          <div
            className="col-start-1 row-start-1 flex min-w-0 transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {banners.map((banner, i) => (
              <HeroSlide key={banner.id} banner={banner} priority={i === 0} />
            ))}
          </div>

          {n > 1 && !hideNav ? (
            <>
              <div
                className="pointer-events-none z-20 col-start-1 row-start-1 flex min-h-0 w-full items-center justify-between self-stretch px-3 opacity-0 transition-opacity duration-200 group-focus-within/hero:opacity-100 group-hover/hero:opacity-100 sm:px-4 md:px-5"
                aria-hidden
              >
                <CarouselNavButton
                  direction="prev"
                  surface="on-photo"
                  onClick={() => go(-1)}
                  className="pointer-events-auto shrink-0"
                  aria-label="Banner sebelumnya"
                />
                <CarouselNavButton
                  direction="next"
                  surface="on-photo"
                  onClick={() => go(1)}
                  className="pointer-events-auto shrink-0"
                  aria-label="Banner berikutnya"
                />
              </div>
              <CarouselDots
                count={n}
                activeIndex={index}
                onSelect={setIndex}
                className="pointer-events-auto z-10 col-start-1 row-start-1 self-end justify-self-center pb-3 sm:pb-4"
                tone="light"
              />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
