"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { saveSetting } from "../_actions";

interface MaintenanceToggleProps {
  initialValue: boolean;
}

export function MaintenanceToggle({ initialValue }: MaintenanceToggleProps) {
  const [isActive, setIsActive] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !isActive;
    startTransition(async () => {
      const { error } = await saveSetting("maintenance_mode", next);
      if (error) {
        toast.error(error);
        return;
      }
      setIsActive(next);
      toast.success(next ? "Maintenance mode diaktifkan." : "Maintenance mode dinonaktifkan.");
    });
  };

  return (
    <StatusPillToggle
      active={isActive}
      onToggle={handleToggle}
      disabled={isPending}
      activeLabel={isPending ? "Menyimpan..." : "Aktif — Klik untuk menonaktifkan"}
      inactiveLabel={isPending ? "Menyimpan..." : "Nonaktif — Klik untuk mengaktifkan"}
    />
  );
}
