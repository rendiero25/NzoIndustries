"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { saveSetting } from "../../_actions";
import { BITESHIP_COURIER_BRANDS } from "@/lib/biteship/courier-brands";

interface CourierBrandFormProps {
  activeCodes: string[];
}

export function CourierBrandForm({ activeCodes }: CourierBrandFormProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(activeCodes));
  const [isPending, startTransition] = useTransition();

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("active_courier_codes", [...selected]);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Pengaturan kurir diperbarui.");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {BITESHIP_COURIER_BRANDS.map((brand) => (
          <label
            key={brand.code}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-[#e0e0e0] px-3 py-2 transition-colors hover:border-brand/50"
          >
            <Checkbox
              checked={selected.has(brand.code)}
              onCheckedChange={() => toggle(brand.code)}
            />
            {brand.logo && (
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-5 w-auto max-w-[44px] shrink-0 object-contain"
              />
            )}
            <span className="text-sm font-medium">{brand.name}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-[#e0e0e0] pt-6">
        <Button type="button" variant="primary" size="sm" onClick={handleSave} loading={isPending}>
          Simpan
        </Button>
      </div>
    </div>
  );
}
