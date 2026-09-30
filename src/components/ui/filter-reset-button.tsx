"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterResetButtonProps = {
  onClick: () => void;
  className?: string;
  label?: string;
};

/** Reset filter admin — dashed hairline, hover brand. */
export function FilterResetButton({
  onClick,
  className,
  label = "Reset",
}: FilterResetButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      onClick={onClick}
      className={cn(
        "min-h-11 gap-1.5 rounded-md border border-dashed border-[#e0e0e0] px-4 text-sm font-normal text-muted-foreground hover:border-brand/40 hover:bg-transparent hover:text-brand",
        className,
      )}
    >
      <X size={14} />
      {label}
    </Button>
  );
}
