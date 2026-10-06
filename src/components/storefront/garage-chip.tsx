"use client";

import { useState } from "react";

import { ShieldMark } from "@/components/catalog/shield-mark";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  VehicleSelector,
  type SelectorActive,
  type SelectorMake,
  type SelectorModel,
} from "./vehicle-selector";

export type GarageData = {
  makes: SelectorMake[];
  models: SelectorModel[];
  active: (SelectorActive & { shortLabel: string }) | null;
};

/**
 * Chip Garasi di header: menampilkan kendaraan aktif ("Vario 125 · 2022") dan
 * membuka pemilih kendaraan. Sinyal utama prinsip "kecocokan dulu".
 */
export function GarageChip({
  garage,
  className,
  onDone,
}: {
  garage: GarageData;
  className?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = garage.active;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "group flex h-11 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-left text-sm transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          active && "border-foreground",
          className,
        )}
        aria-label={active ? `Garasi: ${active.label}. Ganti kendaraan` : "Garasi: pilih kendaraan"}
      >
        <ShieldMark checked={!!active} className="size-4 shrink-0 text-foreground" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-caption text-muted-foreground">Garasi</span>
          <span className="max-w-40 truncate font-medium">
            {active ? active.shortLabel : "Pilih kendaraan"}
          </span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[min(92vw,26rem)] p-4">
        <p className="mb-1 font-semibold">Kendaraan kamu</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Kami tandai part yang cocok dan bisa menyaring katalog untuk kendaraan ini.
        </p>
        <VehicleSelector
          makes={garage.makes}
          models={garage.models}
          active={active}
          onSaved={() => {
            setOpen(false);
            onDone?.();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
