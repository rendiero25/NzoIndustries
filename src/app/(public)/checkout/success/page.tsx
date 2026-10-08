import { CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { PAYMENT_LABELS } from "@/lib/validations/checkout";
import { getOrderForUser } from "@/server/queries/checkout";

export const metadata: Metadata = { title: "Pesanan dibuat", robots: { index: false } };

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

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent("/checkout")}`);
  if (!order || !ORDER_NUMBER.test(order)) notFound();

  const summary = await getOrderForUser(order);
  if (!summary) notFound();

  const payment = summary.paymentProvider ? PAYMENT_LABELS[summary.paymentProvider] : null;

  return (
    <div className="nzo-container flex justify-center py-12 md:py-16">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col items-start gap-3">
          <CircleCheck className="size-10 text-success" strokeWidth={1.75} aria-hidden />
          <h1>Pesanan berhasil dibuat</h1>
          <p className="text-muted-foreground">
            Terima kasih. Stok untuk pesananmu sudah kami tahan sampai batas waktu pembayaran.
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
            <dt className="text-muted-foreground">Metode pembayaran</dt>
            <dd>{payment?.title ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Pengiriman</dt>
            <dd>
              {summary.courier ?? "—"} · {summary.itemCount} barang
            </dd>
          </div>
          {summary.paymentDueAt && summary.status === "pending_payment" ? (
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
        </dl>

        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-5 text-sm">
          <p className="font-semibold">Instruksi pembayaran</p>
          <p className="text-muted-foreground">
            Instruksi pembayaran segera tersedia di halaman ini. Untuk sementara, hubungi kami lewat
            WhatsApp dengan menyebutkan nomor pesanan.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/products">Lanjut belanja</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
