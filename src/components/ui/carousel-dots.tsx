"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselDotsProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
  /** Warna dot — default putih untuk hero gelap */
  tone?: "light" | "dark";
};

/** Indikator slide carousel (dot pill). */
export function CarouselDots({
  count,
  activeIndex,
  onSelect,
  className,
  tone = "light",
}: CarouselDotsProps) {
  if (count <= 1) return null;

  const inactive =
    tone === "light"
      ? "bg-white/40 hover:bg-white/70"
      : "bg-[#1d1d1f]/25 hover:bg-[#1d1d1f]/40";
  const active = tone === "light" ? "w-8 bg-white" : "w-8 bg-[#1d1d1f]";

  return (
    <div className={cn("flex justify-center gap-1", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Button
          key={i}
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onSelect(i)}
          aria-label={`Slide ${i + 1} dari ${count}`}
          aria-current={i === activeIndex ? true : undefined}
          className="h-8 w-8"
        >
          <span
            className={cn(
              "h-2 rounded-full transition-all",
              i === activeIndex ? active : cn("w-2", inactive),
            )}
          />
        </Button>
      ))}
    </div>
  );
}
