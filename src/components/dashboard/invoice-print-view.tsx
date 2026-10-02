"use client";

import Image from "next/image";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/payment-method-labels";
import { formatRupiah, formatDate } from "@/lib/format";
import type { Database } from "@/types/legacy-supabase";
import type { DashboardOrderItemRow } from "@/lib/data/dashboard-user";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];

type WatermarkType = "LUNAS" | "DIBATALKAN" | "DIKEMBALIKAN";

type InvoicePrintViewProps = {
  order: Order;
  items: DashboardOrderItemRow[];
  paidPayment: Payment;
  watermark: WatermarkType;
};

const WATERMARK_COLOR: Record<WatermarkType, string> = {
  LUNAS: "#16a34a",
  DIBATALKAN: "#dc2626",
  DIKEMBALIKAN: "#dc2626",
};

export function InvoicePrintView({ order, items, paidPayment, watermark }: InvoicePrintViewProps) {
  const invoiceDate = paidPayment.paid_at ?? order.created_at;
  const paymentLabel = paidPayment.payment_type
    ? (PAYMENT_METHOD_LABELS[paidPayment.payment_type] ?? paidPayment.payment_type)
    : "—";

  return (
    <>
      {/* Print CSS — only #invoice-print-area visible */}
      <style>{`
        @media print {
          [data-no-print] { display: none !important; }
          body > * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area {
            position: fixed;
            inset: 0;
            width: 100%;
            background: white;
          }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Tombol print — tersembunyi saat print */}
      <div data-no-print className="mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          Cetak Invoice
        </button>
      </div>

      {/* Invoice container */}
      <div
        id="invoice-print-area"
        className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-white p-8 text-foreground print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none"
      >
        {/* Watermark */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: "80px",
            fontWeight: 900,
            opacity: 0.1,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 10,
            color: WATERMARK_COLOR[watermark],
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}
        >
          {watermark}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="relative h-8 w-36">
              <Image
                src="/logo.svg"
                unoptimized
                alt="NZO Industries"
                fill
                className="object-contain object-left"
                sizes="144px"
              />
            </div>
            <p className="mt-2 text-xs text-steel-700">NZO Industries</p>
            <p className="text-xs text-steel-700">nzo-industries.test</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tracking-wide text-foreground uppercase">Invoice</p>
            <p className="mt-1 font-mono text-sm font-bold text-foreground">{order.order_number}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(invoiceDate, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Tagihan kepada */}
        <div className="mt-8 rounded-lg bg-muted p-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Tagihan kepada</p>
          <p className="mt-1.5 font-semibold text-foreground">{order.recipient_name}</p>
          <p className="text-sm text-steel-700">{order.recipient_phone}</p>
          <p className="mt-1 text-sm leading-relaxed text-steel-700">
            {order.shipping_address}, {order.shipping_district}, {order.shipping_city},{" "}
            {order.shipping_province} {order.shipping_postal}
          </p>
        </div>

        {/* Items table */}
        <div className="mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-[11px] font-bold text-muted-foreground uppercase">
                  Produk
                </th>
                <th className="pb-2 text-left text-[11px] font-bold text-muted-foreground uppercase">
                  Varian
                </th>
                <th className="pb-2 text-right text-[11px] font-bold text-muted-foreground uppercase">
                  Qty
                </th>
                <th className="pb-2 text-right text-[11px] font-bold text-muted-foreground uppercase">
                  Harga
                </th>
                <th className="pb-2 text-right text-[11px] font-bold text-muted-foreground uppercase">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-[160px] truncate py-3 pr-3 font-medium text-foreground">
                    {item.product_name}
                  </td>
                  <td className="py-3 pr-3 text-steel-700">{item.variant_name ?? "—"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatRupiah(item.price)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost breakdown */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal produk</span>
              <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Diskon</span>
                <span className="text-foreground tabular-nums">
                  −{formatRupiah(order.discount_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Ongkos kirim</span>
              <span className="tabular-nums">{formatRupiah(order.shipping_cost)}</span>
            </div>
            {order.app_fee > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Biaya jasa aplikasi</span>
                <span className="tabular-nums">{formatRupiah(order.app_fee)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground tabular-nums">{formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="mt-8 rounded-lg bg-muted p-4 text-sm">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">
            Informasi Pembayaran
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-muted-foreground">Metode bayar</span>
              <span className="font-medium text-foreground">{paymentLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-muted-foreground">Waktu bayar</span>
              <span className="text-foreground">
                {formatDate(invoiceDate, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            Terima kasih telah berbelanja di NZO Industries!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pertanyaan? Hubungi kami di nzo-industries.test
          </p>
        </div>
      </div>
    </>
  );
}
