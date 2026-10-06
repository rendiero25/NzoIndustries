"use client";

import { NumberTicker } from "@/components/magicui/number-ticker";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Angka statistik: NumberTicker sekali saat masuk viewport; statis bila reduced motion. */
export function StatsTicker({ value, label }: { value: number; label: string }) {
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-1">
      <dt className="order-2 text-sm text-muted-foreground">{label}</dt>
      <dd className="order-1 text-[1.75rem] leading-9 font-extrabold tracking-[-0.02em] tabular-nums md:text-[2.5rem] md:leading-[3rem]">
        {reduced ? value.toLocaleString("id-ID") : <NumberTicker value={value} />}
      </dd>
    </div>
  );
}
