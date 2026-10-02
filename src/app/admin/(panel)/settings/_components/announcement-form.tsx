"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { saveSetting } from "../_actions";

import { settingsLabelClass } from "../_lib/label-class";

const labelClass = settingsLabelClass;

interface AnnouncementFormProps {
  initialText: string;
  initialActive: boolean;
}

export function AnnouncementForm({ initialText, initialActive }: AnnouncementFormProps) {
  const [text, setText] = useState(initialText);
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("announcement_bar", { text, is_active: isActive });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Announcement bar diperbarui.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className={labelClass}>Teks Pengumuman</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gratis ongkir untuk pembelian di atas Rp 200.000!"
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand/30 focus:outline-none"
        />
      </div>
      <div className="space-y-3 space-x-3">
        <label className={labelClass}>Status</label>
        <StatusPillToggle
          active={isActive}
          onToggle={() => setIsActive((v) => !v)}
          activeLabel="Aktif"
          inactiveLabel="Nonaktif"
        />
      </div>
      <Button type="button" variant="primary" size="sm" onClick={handleSave} loading={isPending}>
        Simpan
      </Button>
    </div>
  );
}
