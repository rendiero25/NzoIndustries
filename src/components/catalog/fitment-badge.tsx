import { cn } from "@/lib/utils";

import { ShieldMark } from "./shield-mark";

type FitmentBadgeProps = {
  /** Mis. "Honda Vario 125 2022". Kosong = label umum "Cocok". */
  vehicle?: string | null;
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Badge "Cocok untuk kendaraanmu" (design-system.md §5, §8). Signal amber
 * sebagai fill dengan teks hitam (aturan aksen §2), perisai hitam.
 */
export function FitmentBadge({ vehicle, size = "sm", className }: FitmentBadgeProps) {
  const label = vehicle ? `Cocok untuk ${vehicle}` : "Cocok";

  if (size === "lg") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2.5 rounded-md bg-signal py-2 pr-3.5 pl-2.5 text-brand-black",
          className,
        )}
      >
        <ShieldMark className="size-5 text-brand-black [--shield-check:var(--color-signal)]" />
        <span className="text-sm leading-5 font-semibold">{label}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-signal py-0.5 pr-1.5 pl-1 text-brand-black",
        className,
      )}
      title={label}
    >
      <ShieldMark className="size-3.5 text-brand-black [--shield-check:var(--color-signal)]" />
      <span className="text-caption font-semibold">{vehicle ? label : "Cocok"}</span>
    </span>
  );
}
