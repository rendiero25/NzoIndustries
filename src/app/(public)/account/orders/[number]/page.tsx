import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClaimDialog, ReturnDialog } from "@/components/account/after-sales-dialogs";
import {
  CancelOrderButton,
  ConfirmReceivedButton,
  TrackingPanel,
} from "@/components/account/order-actions";
import { dateTime } from "@/components/account/order-card";
import { ReviewDialog } from "@/components/account/review-dialog";
import { StatusBadge } from "@/components/account/status-badge";
import { ProductImage } from "@/components/catalog/product-image";
import { PaymentActions } from "@/components/storefront/payment-actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatIDR } from "@/lib/money";
import { orderStatusMeta, RETURN_STATUS_META, REVIEW_STATUS_META } from "@/lib/orders/status";
import { paymentMethodLabel } from "@/lib/payments/mayar-method";
import { getMyOrder } from "@/server/queries/account";

const ORDER_NUMBER = /^NZO-\d{6}-[0-9A-F]{6}$/;

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  return { title: `Pesanan ${number}` };
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  if (!ORDER_NUMBER.test(number)) notFound();
  const order = await getMyOrder(number);
  if (!order) notFound();

  const meta = orderStatusMeta(order.status);
  const pending = order.status === "pending_payment";
  const canConfirm = order.status === "shipped" || order.status === "delivered";
  const received = order.status === "delivered" || order.status === "completed";
  const addr = order.address;
  const deadlineLabel = order.returnDeadline
    ? dateTime.format(new Date(order.returnDeadline))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/account/orders"
          className="flex items-center gap-1 text-sm text-steel-700 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Semua pesanan
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-mono text-xl md:text-2xl">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Dibuat {dateTime.format(new Date(order.createdAt))} WIB
            </p>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} className="h-7 text-sm" />
        </div>
      </div>

      {pending ? (
        <section className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm">
            Selesaikan pembayaran
            {order.paymentDueAt ? (
              <>
                {" "}
                sebelum{" "}
                <span className="font-semibold">
                  {dateTime.format(new Date(order.paymentDueAt))} WIB
                </span>
              </>
            ) : null}
            .
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PaymentActions orderNumber={order.orderNumber} />
            <CancelOrderButton orderNumber={order.orderNumber} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="items"
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <h2 id="items" className="text-base">
              Produk
            </h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-steel-50">
                      <ProductImage publicId={item.imagePublicId} alt={item.name} sizes="64px" />
                    </div>
                    <div className="flex min-w-0 flex-col text-sm">
                      {item.slug ? (
                        <Link
                          href={`/products/${item.slug}`}
                          className="line-clamp-2 font-medium hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <span className="line-clamp-2 font-medium">{item.name}</span>
                      )}
                      {item.variantName ? (
                        <span className="text-caption text-muted-foreground">
                          {item.variantName}
                        </span>
                      ) : null}
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {item.quantity} × {formatIDR(item.unitPrice)}
                      </span>
                      {item.review ? (
                        <span className="text-caption text-muted-foreground">
                          Ulasan {item.review.rating}★ ·{" "}
                          {REVIEW_STATUS_META[item.review.status]?.label ?? item.review.status}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="text-sm font-semibold tabular-nums sm:mr-2">
                      {formatIDR(item.lineTotal)}
                    </span>
                    {received && !item.review && item.productId ? (
                      <ReviewDialog orderItemId={item.id} productName={item.name} />
                    ) : null}
                    {received && !item.hasClaim ? (
                      <ClaimDialog orderItemId={item.id} productName={item.name} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="shipping"
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <h2 id="shipping" className="text-base">
              Pengiriman
            </h2>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Alamat</span>
                <span className="font-medium">
                  {addr.recipient} · {addr.phone}
                </span>
                <span className="text-muted-foreground">
                  {[addr.full_address, addr.district, addr.city, addr.province, addr.postal_code]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Kurir</span>
                <span className="font-medium">
                  {order.shipment
                    ? `${order.shipment.courierCode.toUpperCase()} ${order.shipment.courierService.toUpperCase()}`
                    : "—"}
                </span>
                <span className="text-muted-foreground">
                  Resi:{" "}
                  {order.shipment?.waybill ? (
                    <span className="font-mono text-foreground">{order.shipment.waybill}</span>
                  ) : (
                    "muncul setelah pesanan dikirim"
                  )}
                </span>
              </div>
            </div>
            {order.shipment?.waybill ? <TrackingPanel orderNumber={order.orderNumber} /> : null}
            {canConfirm ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <ConfirmReceivedButton orderNumber={order.orderNumber} />
                <span className="text-caption text-muted-foreground">
                  Tekan setelah semua barang kamu terima.
                </span>
              </div>
            ) : null}
          </section>

          {received ? (
            <section
              aria-labelledby="returns"
              className="flex flex-col gap-3 rounded-xl border border-border p-4"
            >
              <h2 id="returns" className="text-base">
                Retur
              </h2>
              {order.returns.length > 0 ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {order.returns.map((r) => {
                    const m = RETURN_STATUS_META[r.status] ?? {
                      label: r.status,
                      tone: "neutral" as const,
                    };
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>{r.reason}</span>
                        <StatusBadge label={m.label} tone={m.tone} />
                      </li>
                    );
                  })}
                </ul>
              ) : order.canReturn ? (
                <div className="flex flex-wrap items-center gap-3">
                  <ReturnDialog
                    orderNumber={order.orderNumber}
                    items={order.items.map((i) => ({ id: i.id, name: i.name }))}
                    deadline={deadlineLabel}
                  />
                  {deadlineLabel ? (
                    <span className="text-caption text-muted-foreground">
                      Batas pengajuan {deadlineLabel} WIB
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Batas waktu retur sudah lewat. Untuk kerusakan, ajukan klaim garansi per produk.
                </p>
              )}
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="summary"
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <h2 id="summary" className="text-base">
              Rincian pembayaran
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatIDR(order.subtotal)}</dd>
              </div>
              {order.discountTotal > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Diskon</dt>
                  <dd className="text-success tabular-nums">−{formatIDR(order.discountTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Ongkir</dt>
                <dd className="tabular-nums">{formatIDR(order.shippingCost)}</dd>
              </div>
            </dl>
            <Separator />
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold tabular-nums">{formatIDR(order.grandTotal)}</span>
            </div>
            {order.paidAt ? (
              <p className="text-caption text-muted-foreground">
                Dibayar {dateTime.format(new Date(order.paidAt))} WIB
                {order.paymentMethod ? ` · ${paymentMethodLabel(order.paymentMethod)}` : ""}
              </p>
            ) : null}
            {order.invoiceNumber ? (
              <Button asChild variant="outline">
                {/* Route handler PDF: pakai <a> biasa, bukan Link (bukan halaman). */}
                <a href={`/account/orders/${order.orderNumber}/invoice`} download>
                  <FileText className="size-4" /> Unduh invoice
                  <span className="font-mono text-caption text-muted-foreground">
                    {order.invoiceNumber}
                  </span>
                </a>
              </Button>
            ) : (
              <p className="text-caption text-muted-foreground">
                Invoice tersedia setelah pembayaran diterima.
              </p>
            )}
          </section>

          <section
            aria-labelledby="timeline"
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <h2 id="timeline" className="text-base">
              Riwayat status
            </h2>
            <ol className="flex flex-col gap-3 border-l border-border pl-4">
              {[...order.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="relative text-sm">
                  <span
                    className={`absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-steel-200"}`}
                    aria-hidden
                  />
                  <p className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                    {orderStatusMeta(h.status).label}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {dateTime.format(new Date(h.at))} WIB
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {order.customerNote ? (
            <section className="flex flex-col gap-1 rounded-xl border border-border p-4 text-sm">
              <h2 className="text-base">Catatan</h2>
              <p className="text-muted-foreground">{order.customerNote}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
