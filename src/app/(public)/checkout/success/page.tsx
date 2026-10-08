import { CircleCheck, CircleX, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PaymentActions } from "@/components/storefront/payment-actions";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/payments/mayar-method";
import { PAYMENT_LABELS } from "@/lib/validations/checkout";
import { getOrderForUser } from "@/server/queries/checkout";

export const metadata: Metadata = { title: "Status pesanan", robots: { index: false } };

const ORDER_NUMBER = /^NZO-\d{6}-[0-9A-F]{6}$/;

const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const CLOSED = new Set(["expired", "cancelled", "refunded"]);

/** Status pembayaran pesanan: menunggu bayar → lunas, atau kedaluwarsa (Fase 6). */
export default async function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const back = order ? `/checkout/success?order=${order}` : "/checkout";
    redirect(`/login?redirectTo=${encodeURIComponent(back)}`);
  }
  if (!order || !ORDER_NUMBER.test(order)) notFound();

  const summary = await getOrderForUser(order);
  if (!summary) notFound();

  const pending = summary.status === "pending_payment";
  const closed = CLOSED.has(summary.status);
  const paid = !pending && !closed;
  const method = paymentMethodLabel(summary.paymentMethod);

  return (
    <div className="nzo-container flex justify-center py-12 md:py-16">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col items-start gap-3">
          {paid ? (
            <CircleCheck className="size-10 text-success" strokeWidth={1.75} aria-hidden />
          ) : closed ? (
            <CircleX className="size-10 text-danger" strokeWidth={1.75} aria-hidden />
          ) : (
            <Clock className="size-10 text-steel-700" strokeWidth={1.75} aria-hidden />
          )}
          <h1>
            {paid ? "Pembayaran diterima" : closed ? "Pesanan dibatalkan" : "Selesaikan pembayaran"}
          </h1>
          <p className="text-muted-foreground">
            {paid
              ? "Terima kasih. Pesananmu segera kami proses dan kirim."
              : closed
                ? "Batas waktu pembayaran sudah lewat, jadi stok kami lepas lagi. Silakan pesan ulang."
                : "Pesanan sudah dibuat dan stoknya kami tahan sampai batas waktu pembayaran."}
          </p>
        </div>

        <dl className="grid gap-3 rounded-xl border border-border p-5 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Nomor pesanan</dt>
            <dd className="font-mono font-semibold">{summary.orderNumber}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Total bayar</dt>
            <dd className="text-lg font-bold tabular-nums">{formatIDR(summary.grandTotal)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Pembayaran</dt>
            <dd>
              {paid && method
                ? method
                : summary.paymentProvider
                  ? PAYMENT_LABELS[summary.paymentProvider].title
                  : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Pengiriman</dt>
            <dd>
              {summary.courier ?? "—"} · {summary.itemCount} barang
            </dd>
          </div>
          {pending && summary.paymentDueAt ? (
            <div className="flex items-start gap-2 rounded-lg bg-steel-50 p-3 sm:col-span-2">
              <Clock className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <p>
                Bayar sebelum{" "}
                <span className="font-semibold">
                  {dateTime.format(new Date(summary.paymentDueAt))} WIB
                </span>
                . Lewat dari itu pesanan dibatalkan otomatis.
              </p>
            </div>
          ) : null}
          {paid && summary.paidAt ? (
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-muted-foreground">Dibayar</dt>
              <dd>{dateTime.format(new Date(summary.paidAt))} WIB</dd>
            </div>
          ) : null}
        </dl>

        {pending ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Bayar lewat QRIS, virtual account, atau e-wallet di halaman Mayar. Status diperbarui
              otomatis setelah pembayaran berhasil.
            </p>
            <PaymentActions orderNumber={summary.orderNumber} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" variant={pending ? "outline" : "default"}>
            <Link href="/products">{closed ? "Belanja lagi" : "Lanjut belanja"}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
