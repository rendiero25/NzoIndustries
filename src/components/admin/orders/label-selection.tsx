"use client";

import { Printer, X } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const MAX_LABELS = 50;

type Ctx = {
  selected: Set<string>;
  toggle: (orderNumber: string, on: boolean) => void;
  setMany: (orderNumbers: string[], on: boolean) => void;
  clear: () => void;
};

const SelectionContext = createContext<Ctx | null>(null);

function useSelection(): Ctx {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("LabelSelectionProvider belum dipasang");
  return ctx;
}

/** Pilihan pesanan untuk cetak resi massal (maks 50 per PDF). */
export function LabelSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const value = useMemo<Ctx>(
    () => ({
      selected,
      toggle: (n, on) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (on && next.size < MAX_LABELS) next.add(n);
          else next.delete(n);
          return next;
        }),
      setMany: (list, on) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const n of list) {
            if (on && next.size < MAX_LABELS) next.add(n);
            else if (!on) next.delete(n);
          }
          return next;
        }),
      clear: () => setSelected(new Set()),
    }),
    [selected],
  );
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function SelectOrderCheckbox({ orderNumber }: { orderNumber: string }) {
  const { selected, toggle } = useSelection();
  return (
    <Checkbox
      aria-label={`Pilih ${orderNumber} untuk cetak resi`}
      checked={selected.has(orderNumber)}
      onCheckedChange={(v) => toggle(orderNumber, v === true)}
    />
  );
}

export function SelectAllCheckbox({ orderNumbers }: { orderNumbers: string[] }) {
  const { selected, setMany } = useSelection();
  const all = orderNumbers.length > 0 && orderNumbers.every((n) => selected.has(n));
  const some = orderNumbers.some((n) => selected.has(n));
  return (
    <Checkbox
      aria-label="Pilih semua pesanan siap kirim di halaman ini"
      disabled={orderNumbers.length === 0}
      checked={all ? true : some ? "indeterminate" : false}
      onCheckedChange={(v) => setMany(orderNumbers, v === true)}
    />
  );
}

export function LabelSelectionBar() {
  const { selected, clear } = useSelection();
  if (selected.size === 0) return null;
  const href = `/admin/orders/labels?numbers=${encodeURIComponent([...selected].join(","))}`;
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 shadow-sm">
      <span className="text-sm">
        <span className="font-semibold tabular-nums">{selected.size}</span> pesanan dipilih
        {selected.size >= MAX_LABELS ? " (maksimal 50 per cetak)" : ""}
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={clear}>
          <X /> Batal pilih
        </Button>
        <Button asChild size="sm">
          <a href={href} target="_blank" rel="noopener">
            <Printer /> Cetak resi ({selected.size})
          </a>
        </Button>
      </div>
    </div>
  );
}
