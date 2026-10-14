import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/account/status-badge";
import { AdminOrderActions } from "@/components/admin/orders/admin-order-actions";
import { OrderDocuments } from "@/components/admin/orders/order-documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { orderStatusMeta } from "@/lib/orders/status";
import { paymentMethodLabel } from "@/lib/payments/mayar-method";
import { getAdminOrder } from "@/server/queries/admin/orders";
import { getStoreInfo, LABEL_STATUSES } from "@/server/queries/documents";

const ORDER_NUMBER = /^NZO-\d{6}-[0-9A-F]{6}$/;
const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  return { title: `Pesanan ${(await params).number}` };
}

const PAYMENT_STATUS: Record<string, string> = {
  pending: "Menunggu",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  failed: "Gagal",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const user = await requireStaff();
  const { number } = await params;
  if (!ORDER_NUMBER.test(number)) notFound();
  const [o, store] = await Promise.all([getAdminOrder(number), getStoreInfo()]);
  if (!o) notFound();

  const meta = orderStatusMeta(o.status);
  const paidAfterCancel =
    (o.status === "expired" || o.status === "cancelled") &&
    o.payments.some((p) => p.status === "paid");
  const addr = o.address;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-sm text-steel-700 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Semua pesanan
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-2xl">{o.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Dibuat {dateTime.format(new Date(o.createdAt))} WIB
            </p>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} className="h-7 text-sm" />
        </div>
        {paidAfterCancel ? (
          <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
            Pembayaran masuk setelah pesanan {meta.label.toLowerCase()}. Aktifkan ulang bila stok
            cukup, atau refund manual lewat dashboard Mayar.
          </p>
        ) : null}
        <AdminOrderActions
          orderNumber={o.orderNumber}
          status={o.status}
          courierCode={o.shipment?.courierCode ?? null}
          canManage={user.role === "owner" || user.role === "admin"}
          canShip={user.role !== "cs"}
          paidAfterCancel={paidAfterCancel}
        />
        <OrderDocuments
          orderNumber={o.orderNumber}
          invoiceNumber={o.invoiceNumber}
          canPrintLabel={
            user.role !== "cs" &&
            LABEL_STATUSES.includes(o.status as (typeof LABEL_STATUSES)[number])
          }
          shipperIncomplete={!store.shipper.address || !store.shipper.phone}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produk</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="pr-6 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="pl-6">
                        {i.productId ? (
                          <Link href={`/admin/products/${i.productId}`} className="hover:underline">
                            {i.name}
                          </Link>
                        ) : (
                          i.name
                        )}
                        {i.variantName ? (
                          <div className="text-caption text-muted-foreground">{i.variantName}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-caption">{i.sku}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {i.quantity} × {formatIDR(i.unitPrice)}
                      </TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {formatIDR(i.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Penerima</span>
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
                  {o.shipment
                    ? `${o.shipment.courierCode.toUpperCase()} ${o.shipment.courierService.toUpperCase()}`
                    : "—"}{" "}
                  · {formatIDR(o.shipment?.cost ?? o.shippingCost)}
                </span>
                <span className="text-muted-foreground">
                  Resi:{" "}
                  {o.shipment?.waybill ? (
                    <span className="font-mono text-foreground">{o.shipment.waybill}</span>
                  ) : (
                    "belum ada"
                  )}
                </span>
                {o.shipment?.shippedAt ? (
                  <span className="text-caption text-muted-foreground">
                    Dikirim {dateTime.format(new Date(o.shipment.shippedAt))}
                  </span>
                ) : null}
              </div>
              {o.customerNote ? (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-muted-foreground">Catatan pembeli</span>
                  <span>{o.customerNote}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat status</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 border-l border-border pl-4">
                {o.history.map((h, i) => (
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
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatIDR(o.subtotal)}</span>
              </div>
              {o.discountTotal > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Diskon{o.voucherCode ? ` (${o.voucherCode})` : ""}
                  </span>
                  <span className="text-success tabular-nums">−{formatIDR(o.discountTotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span className="tabular-nums">{formatIDR(o.shippingCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatIDR(o.grandTotal)}</span>
              </div>
              <Separator />
              {o.payments.length === 0 ? (
                <p className="text-muted-foreground">Belum ada link pembayaran.</p>
              ) : (
                o.payments.map((p, i) => (
                  <div key={i} className="flex flex-col gap-0.5 rounded-md bg-steel-50 p-2">
                    <span className="flex justify-between">
                      <span>{PAYMENT_STATUS[p.status] ?? p.status}</span>
                      <span className="tabular-nums">{formatIDR(p.amount)}</span>
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {paymentMethodLabel(p.method) ?? "Mayar"}
                      {p.paidAt ? ` · ${dateTime.format(new Date(p.paidAt))}` : ""}
                    </span>
                    {p.providerRef ? (
                      <span className="font-mono text-caption break-all text-muted-foreground">
                        {p.providerRef}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
              {o.cancelReason ? (
                <p className="text-caption text-muted-foreground">Alasan: {o.cancelReason}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {o.customer ? (
                <div className="flex flex-col gap-0.5">
                  {user.role === "warehouse" ? (
                    <span>{o.customer.name ?? "—"}</span>
                  ) : (
                    <Link
                      href={`/admin/customers/${o.customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {o.customer.name ?? "Tanpa nama"}
                    </Link>
                  )}
                  <span className="text-muted-foreground">{o.customer.phone ?? "—"}</span>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Data pelanggan tidak tersedia untuk role ini.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
