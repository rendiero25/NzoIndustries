"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

interface ThresholdFormProps {
  initialValue: number;
}

export function ThresholdForm({ initialValue }: ThresholdFormProps) {
  const [value, setValue] = useState(String(initialValue));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Masukkan nominal yang valid.");
      return;
    }
    startTransition(async () => {
      const { error } = await saveSetting("free_shipping_threshold", parsed);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Threshold free ongkir diperbarui.");
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <label className={labelClass}>Minimum Pembelian (Rp)</label>
        <div className="flex h-10 items-center overflow-hidden rounded-lg border border-border">
          <span className="flex h-full items-center border-r border-border px-3 text-sm text-muted-foreground">
            Rp
          </span>
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-full max-w-[10rem] rounded-none border-0 text-sm focus-visible:ring-0"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="shrink-0"
        onClick={handleSave}
        loading={isPending}
      >
        Simpan
      </Button>
    </div>
  );
}
