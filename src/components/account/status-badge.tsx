import type { StatusTone } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-steel-50 text-steel-700 border-border",
  info: "bg-info/10 text-info border-info/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  success: "bg-success/10 text-success border-success/20",
  danger: "bg-danger/10 text-danger border-danger/20",
};

/** Chip status (design-system §2 warna semantik, radius-sm). */
export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-sm border px-2 text-caption font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
