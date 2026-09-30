"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  fullWidth?: boolean;
  size?: "default" | "compact";
  "aria-label"?: string;
};

const segmentBase =
  "border-r border-[#e0e0e0] px-4 text-sm font-normal leading-[1.29] tracking-[-0.224px] transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF7A52] active:scale-95 disabled:pointer-events-none disabled:opacity-50";

/** Segmented control — grup pilihan terlampir (hairline + brand tint saat aktif). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  fullWidth = false,
  size = "default",
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-[#e0e0e0] bg-card",
        fullWidth && "w-full",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              segmentBase,
              size === "default" ? "min-h-11" : "min-h-9",
              fullWidth && "flex-1",
              selected
                ? "bg-brand/10 text-brand"
                : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
