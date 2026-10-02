import { discountPercent, formatIDR } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceProps = {
  price: number;
  compareAt?: number | null;
  /** Tampilkan "Hemat X%" (PDP). */
  showSaving?: boolean;
  size?: "card" | "pdp";
  className?: string;
};

/**
 * Harga aktif + harga coret setelahnya (design-system.md §3). Selalu
 * tabular-nums. Pembaca layar mendapat kalimat lengkap.
 */
export function Price({
  price,
  compareAt,
  showSaving = false,
  size = "card",
  className,
}: PriceProps) {
  const saving = discountPercent(price, compareAt);
  const hasCompare = saving !== null && compareAt != null;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-bold tabular-nums",
          size === "pdp" ? "text-[1.75rem] leading-9" : "text-lg leading-7",
        )}
      >
        <span className="sr-only">Harga </span>
        {formatIDR(price)}
      </span>
      {hasCompare ? (
        <span className="text-sm leading-[1.375rem] text-muted-foreground tabular-nums line-through">
          <span className="sr-only">Harga sebelumnya </span>
          {formatIDR(compareAt)}
        </span>
      ) : null}
      {hasCompare && showSaving ? (
        <span className="rounded-sm bg-signal px-1.5 py-0.5 text-caption font-semibold text-brand-black">
          Hemat {saving}%
        </span>
      ) : null}
    </div>
  );
}
