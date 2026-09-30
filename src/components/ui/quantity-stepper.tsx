"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "compact";
};

/** Stepper jumlah — pill container + tombol ghost (design: utility on canvas). */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onDecrease,
  onIncrease,
  disabled = false,
  className,
  size = "default",
}: QuantityStepperProps) {
  const btnSize = size === "default" ? "icon" : "icon-sm";
  const btnDim = size === "default" ? "size-11" : "size-9";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#e0e0e0] bg-white p-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className={cn(btnDim, "min-h-0 rounded-full text-[#1d1d1f] hover:bg-[#f5f5f7]")}
        aria-label="Kurangi jumlah"
        disabled={disabled || value <= min || max < min}
        onClick={onDecrease}
      >
        <Minus className="h-4 w-4" strokeWidth={2} />
      </Button>
      <span
        className={cn(
          "min-w-[2.5rem] text-center font-semibold tabular-nums text-[#1d1d1f]",
          size === "default" ? "text-sm" : "text-xs",
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={btnSize}
        className={cn(btnDim, "min-h-0 rounded-full text-[#1d1d1f] hover:bg-[#f5f5f7]")}
        aria-label="Tambah jumlah"
        disabled={disabled || value >= max || max < min}
        onClick={onIncrease}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </Button>
    </div>
  );
}
