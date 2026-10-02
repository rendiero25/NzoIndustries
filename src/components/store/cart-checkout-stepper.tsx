import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { step: 1 as const, label: "Cart", href: "/cart" },
  { step: 2 as const, label: "Checkout", href: "/checkout" },
  { step: 3 as const, label: "Done", href: null },
];

export function CartCheckoutStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav
      aria-label="Langkah belanja"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-4 md:gap-x-6"
    >
      {steps.map((s, i) => {
        const active = s.step === current;
        const done = s.step < current;
        const content = (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition",
              active && "border-black bg-black text-white",
              done && !active && "border-foreground bg-primary text-white",
              !active && !done && "border-border bg-white text-muted-foreground",
            )}
          >
            {done && !active ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : s.step}
          </span>
        );
        const label = (
          <span
            className={cn(
              "text-xs font-semibold uppercase sm:text-sm",
              active && "text-foreground",
              done && !active && "text-foreground",
              !active && !done && "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
        );

        return (
          <div key={s.step} className="flex items-center gap-2 sm:gap-3">
            {i > 0 ? (
              <span className="hidden h-px w-6 bg-steel-200 sm:block sm:w-10" aria-hidden />
            ) : null}
            <div className="flex items-center gap-2">
              {s.href ? (
                <Link
                  href={s.href}
                  className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {content}
                  {label}
                </Link>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-2",
                    done ? "cursor-default" : "cursor-not-allowed opacity-60",
                  )}
                >
                  {content}
                  {label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
