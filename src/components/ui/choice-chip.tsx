"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChoiceChipProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

/** Chip pilihan tunggal (varian produk, kondisi) — primary saat terpilih, secondary jika tidak. */
export function ChoiceChip({
  selected,
  onClick,
  children,
  disabled = false,
  className,
}: ChoiceChipProps) {
  return (
    <Button
      type="button"
      variant={selected ? "primary" : "secondary"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn("min-h-9", className)}
    >
      {children}
    </Button>
  );
}
