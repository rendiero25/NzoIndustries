"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type HorizontalScrollRowProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Jarak antar item (Tailwind gap) */
  gapClass?: string;
  /**
   * @deprecated Lebar baris kini ditangani oleh `flex-1` pada scroll container.
   * Prop ini masih diterima agar caller tidak perlu diubah.
   */
  fillRow?: boolean;
  /** Jumlah item yang digeser sekaligus per klik panah (1 slide = N item). Default 1. */
  itemsPerSlide?: number;
};

export function HorizontalScrollRow({
  children,
  className,
  contentClassName,
  gapClass = "gap-4",
  fillRow: _fillRow,
  itemsPerSlide = 1,
}: HorizontalScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showChevrons, setShowChevrons] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollWidth > el.clientWidth + 2;
    setShowChevrons(scrollable);
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      const el = ref.current;
      if (!el) return;
      const firstSlot = el.firstElementChild as HTMLElement | null;
      if (firstSlot) {
        const gap = parseFloat(getComputedStyle(el).gap) || 0;
        const slotWidth = firstSlot.offsetWidth + gap;
        el.scrollBy({ left: dir * slotWidth * itemsPerSlide, behavior: "smooth" });
      } else {
        el.scrollBy({ left: Math.round(el.clientWidth * 0.85) * dir, behavior: "smooth" });
      }
    },
    [itemsPerSlide],
  );

  const chevronBaseClass =
    "flex size-10 items-center justify-center text-[#1d1d1f] opacity-0 transition-opacity duration-200 " +
    "pointer-events-none group-hover:pointer-events-auto hover:text-brand " +
    "disabled:pointer-events-none disabled:text-muted-foreground disabled:hover:text-muted-foreground";

  return (
    <div className={cn("group relative", className)}>
      <div
        ref={ref}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          gapClass,
          contentClassName,
        )}
      >
        {children}
      </div>

      {showChevrons ? (
        <div className="absolute top-1/2 -left-4 z-10 -translate-y-1/2 sm:-left-6 lg:-left-8">
          <button
            type="button"
            aria-label="Geser kiri"
            onClick={() => scrollByDir(-1)}
            disabled={!canLeft}
            className={cn(
              chevronBaseClass,
              canLeft ? "group-hover:opacity-100" : "group-hover:opacity-40",
            )}
          >
            <ChevronLeft className="h-8 w-8" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}

      {showChevrons ? (
        <div className="absolute top-1/2 -right-4 z-10 -translate-y-1/2 sm:-right-6 lg:-right-8">
          <button
            type="button"
            aria-label="Geser kanan"
            onClick={() => scrollByDir(1)}
            disabled={!canRight}
            className={cn(
              chevronBaseClass,
              canRight ? "group-hover:opacity-100" : "group-hover:opacity-40",
            )}
          >
            <ChevronRight className="h-8 w-8" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
