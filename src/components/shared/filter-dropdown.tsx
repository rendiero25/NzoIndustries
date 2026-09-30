"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
};

type FilterDropdownProps = {
  value: string;
  options: FilterOption[];
  onValueChange: (value: string) => void;
  className?: string;
  align?: "start" | "center" | "end";
  "aria-label"?: string;
  /** Tampilkan trigger dengan gaya aktif (bg hitam, teks putih) — dipakai saat filter ini sedang dipilih. */
  active?: boolean;
};

const triggerBaseClass =
  "h-8 min-h-8 w-full shrink-0 justify-between gap-1.5 rounded-md border-[#e0e0e0] px-2.5 py-2 text-sm font-normal text-[#1d1d1f] focus-visible:outline-[#1d1d1f]/40 sm:w-[13rem]";

/** Filter URL/query — shadcn DropdownMenu (radio), trigger netral hitam. */
export function FilterDropdown({
  value,
  options,
  onValueChange,
  className,
  align = "start",
  "aria-label": ariaLabel,
  active = false,
}: FilterDropdownProps) {
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={active ? "dark" : "table-action"}
          size="sm"
          aria-label={ariaLabel ?? selected?.label}
          style={
            active
              ? { backgroundColor: "#1d1d1f", color: "#fff", borderColor: "transparent" }
              : undefined
          }
          className={cn(triggerBaseClass, className)}
        >
          <span className="truncate">{selected?.label ?? "Pilih"}</span>
          <ChevronDown className={cn("size-4 shrink-0", active ? "opacity-70" : "opacity-50")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((opt) => (
            <DropdownMenuRadioItem key={opt.value} value={opt.value}>
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
