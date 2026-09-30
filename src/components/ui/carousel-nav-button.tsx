"use client";

import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselNavButtonProps = {
  direction: "prev" | "next";
  /** `on-photo` = chip translucen di atas foto; `surface` = pearl di canvas terang */
  surface?: "on-photo" | "surface";
} & Pick<ComponentProps<typeof Button>, "onClick" | "disabled" | "className" | "aria-label">;

/** Tombol panah carousel horizontal. */
export function CarouselNavButton({
  direction,
  surface = "surface",
  onClick,
  disabled,
  className,
  "aria-label": ariaLabel,
}: CarouselNavButtonProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <Button
      type="button"
      variant={surface === "on-photo" ? "icon-chip" : "pearl"}
      size={surface === "on-photo" ? "icon" : "icon-sm"}
      onClick={(e) => {
        onClick?.(e);
        e.currentTarget.blur();
      }}
      disabled={disabled}
      aria-label={ariaLabel ?? (direction === "prev" ? "Sebelumnya" : "Berikutnya")}
      className={cn(
        surface === "on-photo" && "text-white",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </Button>
  );
}
