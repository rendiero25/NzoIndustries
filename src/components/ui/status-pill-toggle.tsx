"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusPillToggleProps = {
  active: boolean;
  onToggle: () => void;
  activeLabel: ReactNode;
  inactiveLabel: ReactNode;
  disabled?: boolean;
  size?: "default" | "compact";
  className?: string;
};

/** Toggle status aktif/nonaktif — pill; aktif memakai aksen brand. */
export function StatusPillToggle({
  active,
  onToggle,
  activeLabel,
  inactiveLabel,
  disabled = false,
  size = "default",
  className,
}: StatusPillToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group/pill relative overflow-hidden inline-flex items-center gap-2 rounded-md border transition-[transform,background-color,color,border-color] duration-[160ms] ease-spring motion-reduce:transition-[background-color,color,border-color]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] motion-safe:active:scale-95 motion-safe:active:duration-[50ms] disabled:opacity-50",
        size === "default"
          ? "min-h-10 px-4 text-sm font-normal leading-[1.29] tracking-[-0.224px]"
          : "min-h-8 px-3 text-[10px] font-semibold uppercase leading-none tracking-normal",
        active
          ? "border-brand/30 bg-brand/10 text-brand"
          : "border-[#e0e0e0] bg-muted text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-0 rounded-[inherit] bg-current opacity-0 transition-[transform,opacity] duration-300 ease-spring group-active/pill:scale-150 group-active/pill:opacity-[0.12] group-active/pill:[transition-duration:50ms] motion-reduce:hidden"
      />
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
