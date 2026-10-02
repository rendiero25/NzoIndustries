"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../_actions";

import { settingsLabelClass } from "../_lib/label-class";

const labelClass = settingsLabelClass;

interface AutoCompleteFormProps {
  initialValue: number;
}

export function AutoCompleteForm({ initialValue }: AutoCompleteFormProps) {
  const [days, setDays] = useState(String(initialValue));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseInt(days, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      toast.error("Masukkan jumlah hari yang valid (minimum 1).");
      return;
    }
    startTransition(async () => {
      const { error } = await saveSetting("auto_complete_days", parsed);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Pengaturan auto complete diperbarui.");
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
      <div className="space-y-3 space-x-3">
        <label className={labelClass}>Jumlah Hari</label>
        <Input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(e.target.value)}
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
