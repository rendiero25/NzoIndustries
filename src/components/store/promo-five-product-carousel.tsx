"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { HomeProductTile } from "@/components/store/home-product-tile";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";
import { HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import { cn } from "@/lib/utils";

const VISIBLE = 5;

type PromoFiveProductCarouselProps = {
  products: HomeShelfProduct[];
  "aria-label"?: string;
};

export function PromoFiveProductCarousel({
  products,
  "aria-label": ariaLabel,
}: PromoFiveProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(products.length > VISIBLE);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => el.removeEventListener("scroll", updateArrows);
  }, [updateArrows]);

  const go = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstSlot = el.firstElementChild as HTMLElement | null;
    if (!firstSlot) return;
    const gap = parseFloat(getComputedStyle(el).gap) || 12;
    el.scrollBy({ left: dir * (firstSlot.offsetWidth + gap), behavior: "smooth" });
  }, []);

  if (products.length === 0) return null;

  const showChevrons = products.length > VISIBLE;

  return (
    <div
      className="flex items-center gap-2"
      role="region"
      aria-label={ariaLabel ?? "Deretan produk"}
    >
      {showChevrons ? (
        <CarouselNavButton
          direction="prev"
          surface="surface"
          onClick={() => go(-1)}
          disabled={!canLeft}
          className={cn("shrink-0", !canLeft && "pointer-events-none opacity-40")}
          aria-label="Produk sebelumnya"
        />
      ) : null}

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div
            key={`${p.productId}-${p.variantId}`}
            className={cn(HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS, "snap-start")}
          >
            <HomeProductTile product={p} layout="promoRow" />
          </div>
        ))}
      </div>

      {showChevrons ? (
        <CarouselNavButton
          direction="next"
          surface="surface"
          onClick={() => go(1)}
          disabled={!canRight}
          className={cn("shrink-0", !canRight && "pointer-events-none opacity-40")}
          aria-label="Produk berikutnya"
        />
      ) : null}
    </div>
  );
}
