"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaymentCountdown } from "@/components/dashboard/payment-countdown";
import { createClient } from "@/lib/supabase/legacy/client";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/payment-method-labels";
import { PAYMENT_METHOD_LOGOS } from "@/lib/constants/payment-method-logos";
import { formatRupiah } from "@/lib/format";
import type { PendingOrderPreview } from "@/lib/data/dashboard-user";

type Props = { initialOrders: PendingOrderPreview[]; userId: string };

export function PendingPaymentSection({ initialOrders, userId }: Props) {
  const [orders, setOrders] = useState<PendingOrderPreview[]>(initialOrders);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-pending-orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          if (updated.status !== "pending_payment") {
            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (orders.length === 0) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-foreground/20 bg-muted">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <AlertCircle className="h-4 w-4 text-foreground" />
          </span>
          <p className="text-[15px] font-semibold text-foreground">
            {orders.length === 1
              ? "1 pesanan menunggu pembayaran"
              : `${orders.length} pesanan menunggu pembayaran`}
          </p>
        </div>
        {orders.length > 1 && (
          <Link
            href="/dashboard/orders?status=pending_payment"
            className="shrink-0 text-[12px] font-medium text-foreground underline-offset-2 hover:underline"
          >
            Lihat semua →
          </Link>
        )}
      </div>

      {/* Subtitle */}
      <p className="px-5 pt-3 text-[13px] leading-relaxed text-steel-700">
        Segera selesaikan pembayaran sebelum pesanan otomatis dibatalkan.
      </p>

      {/* Order cards */}
      <ul className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        {orders.map((o) => {
          const ref = o.vaNumber ?? o.paymentCode ?? null;
          const refLabel = o.vaNumber
            ? "No. Virtual Account"
            : o.paymentCode
              ? "Kode pembayaran"
              : null;
          const methodLabel = o.paymentType
            ? (PAYMENT_METHOD_LABELS[o.paymentType] ?? o.paymentType)
            : null;
          const logoSrc = o.paymentType ? (PAYMENT_METHOD_LOGOS[o.paymentType] ?? null) : null;
          return (
            <li
              key={o.id}
              className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-ring/10"
            >
              {/* Card header: order number + countdown */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <p className="font-mono text-[12px] font-bold tracking-tight text-foreground">
                  {o.order_number}
                </p>
                {o.expiryTime && <PaymentCountdown expiryTime={o.expiryTime} />}
              </div>

              {/* Card body */}
              <div className="px-4 pt-3 pb-4">
                {o.previewName && (
                  <p className="truncate text-[13px] leading-snug font-medium text-foreground">
                    {o.previewName}
                  </p>
                )}
                {(methodLabel ?? ref) && (
                  <div className="mt-2.5 rounded-lg bg-muted px-3 py-2">
                    {methodLabel && (
                      <div className="flex items-center gap-2">
                        {logoSrc && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoSrc}
                            alt={methodLabel}
                            className="h-4 w-auto max-w-[36px] shrink-0 object-contain"
                          />
                        )}
                        <span className="text-[11px] font-semibold text-steel-700">
                          {methodLabel}
                        </span>
                      </div>
                    )}
                    {ref && refLabel && (
                      <div className={`flex items-center gap-2 ${methodLabel ? "mt-1" : ""}`}>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {refLabel}:
                        </span>
                        <span className="min-w-0 truncate font-mono text-[12px] font-semibold text-foreground select-all">
                          {ref}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[16px] font-bold text-foreground tabular-nums">
                    {formatRupiah(o.total)}
                  </p>
                  <Button
                    asChild
                    variant="dark"
                    size="sm"
                    className="text-white no-underline hover:text-white"
                  >
                    <Link href={`/dashboard/orders/${o.id}`}>Bayar sekarang</Link>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
