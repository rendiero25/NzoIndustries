"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Package } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrderAWB } from "../../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

interface AWBFormProps {
  orderId: string;
  currentAWB?: string | null;
}

export function AWBForm({ orderId, currentAWB }: AWBFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const value = inputRef.current?.value.trim() ?? "";
    if (!value) return;
    startTransition(async () => {
      const result = await updateOrderAWB(orderId, value);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Nomor resi berhasil disimpan.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  if (currentAWB) {
    return (
      <div className="space-y-1.5">
        <Label className={labelClass}>Nomor Resi (AWB)</Label>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-[#e0e0e0] bg-muted/40 px-3">
          <Package size={13} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 font-mono text-sm font-semibold">{currentAWB}</span>
          <Lock size={12} className="shrink-0 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="awb" className={labelClass}>
        Nomor Resi (AWB)
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="awb"
          placeholder="Masukkan nomor resi..."
          className="h-10 rounded-lg border-[#e0e0e0] font-mono text-sm"
          disabled={isPending}
          onBlur={save}
          onKeyDown={handleKeyDown}
        />
        {isPending && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Tekan Enter atau klik di luar field untuk menyimpan
      </p>
    </div>
  );
}
