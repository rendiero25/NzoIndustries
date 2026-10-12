"use client";

import { Copy, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/money";
import type { PublicVoucher } from "@/server/queries/account";

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function benefit(v: PublicVoucher): string {
  if (v.discountType === "percent") {
    return `Diskon ${v.discountValue}%${v.maxDiscount ? ` s.d. ${formatIDR(v.maxDiscount)}` : ""}`;
  }
  return `Potongan ${formatIDR(v.discountValue)}`;
}

/** Kartu voucher publik (D-33) + tombol salin kode. */
export function VoucherList({ vouchers }: { vouchers: PublicVoucher[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {vouchers.map((v) => (
        <li key={v.code} className="flex gap-3 rounded-xl border border-dashed border-border p-4">
          <Ticket
            className="mt-0.5 size-5 shrink-0 text-steel-700"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="font-semibold">{benefit(v)}</span>
            {v.description ? <span className="text-muted-foreground">{v.description}</span> : null}
            <span className="text-caption text-muted-foreground">
              {v.minSubtotal > 0
                ? `Min. belanja ${formatIDR(v.minSubtotal)}`
                : "Tanpa minimal belanja"}
              {v.endsAt ? ` · s.d. ${date.format(new Date(v.endsAt))}` : ""}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded-sm bg-steel-50 px-2 py-1 font-mono text-sm font-semibold">
                {v.code}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(v.code);
                    toast.success("Kode disalin", {
                      description: "Tempel di langkah voucher saat checkout.",
                    });
                  } catch {
                    toast.error("Gagal menyalin. Salin manual kodenya.");
                  }
                }}
              >
                <Copy className="size-4" /> Salin
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
