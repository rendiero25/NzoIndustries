"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

import { settingsLabelClass } from "../../_lib/label-class";

const labelClass = settingsLabelClass;

interface TimeoutFormProps {
  initialValue: number;
}

export function TimeoutForm({ initialValue }: TimeoutFormProps) {
  const [hours, setHours] = useState(String(initialValue));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseInt(hours, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      toast.error("Masukkan jumlah jam yang valid (minimum 1).");
      return;
    }
    startTransition(async () => {
      const { error } = await saveSetting("payment_timeout_hours", parsed);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Batas waktu pembayaran diperbarui.");
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <label className={labelClass}>Batas Waktu (Jam)</label>
        <Input
          type="number"
          min={1}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="h-10 w-full max-w-[7rem] rounded-lg border-border text-sm sm:w-28"
        />
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
