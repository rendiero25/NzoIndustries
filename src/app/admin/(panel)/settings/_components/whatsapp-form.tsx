"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../_actions";

import { settingsLabelClass } from "../_lib/label-class";

const labelClass = settingsLabelClass;

interface WhatsappFormProps {
  initialValue: string;
}

export function WhatsappForm({ initialValue }: WhatsappFormProps) {
  const [phone, setPhone] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("whatsapp_cs", phone.trim());
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Nomor WhatsApp CS diperbarui.");
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <label className={labelClass}>Nomor WhatsApp (format: 628xxx)</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6281234567890"
          className="h-10 rounded-lg border-border text-sm"
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
