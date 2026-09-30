"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  /** Kelas pada slot kanan (posisi horizontal), bukan pada tombol. */
  className?: string;
  labelVisible?: string;
  labelHidden?: string;
  iconSize?: number;
};

/**
 * Tombol show/hide di dalam field password.
 * Slot kanan 44px (inset-y-0 + flex center) — selaras input auth h-12.
 */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  className,
  labelVisible = "Tampilkan kata sandi",
  labelHidden = "Sembunyikan kata sandi",
  iconSize = 18,
}: PasswordVisibilityToggleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center",
        className,
      )}
    >
      <Button
        type="button"
        variant="icon-chip"
        size="icon-sm"
        className="pointer-events-auto shrink-0 text-[#1d1d1f]"
        onClick={onToggle}
        aria-label={visible ? labelHidden : labelVisible}
      >
        {visible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
      </Button>
    </div>
  );
}
