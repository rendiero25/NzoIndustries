import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, MapPin, Package, Phone, Printer, User } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { cancelExpiredOrder } from "@/lib/orders/cancel-expired";
import { formatRupiah, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";
import {
  fetchBiteshipTracking,
  trackingStepsFromHistory,
  type TrackingResult,
} from "@/lib/biteship/fetch-tracking";
import { StatusUpdater } from "./_components/status-updater";
import { AWBForm } from "./_components/awb-form";
import { SyncBiteshipButton } from "./_components/sync-biteship-button";
import { ConfirmPickupButton } from "./_components/confirm-pickup-button";
import { StartPackingButton } from "./_components/start-packing-button";
import { ShipmentTrackingCard } from "./_components/tracking-timeline";
import type { OrderStatus } from "../_constants";

export const metadata: Metadata = { title: "Detail Pesanan — Admin NZO Industries" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// ─── Status config ────────────────────────────────────────────────────────────

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  challenge: "Perlu Review",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: history }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
        *,
        order_items(*),
        payments(*),
        shipments(*)
      `,
      )
      .eq("id", id)
      .single(),
    supabase
      .from("order_status_history")
      .select("id, status, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!order) notFound();

  // Mark as viewed (fire-and-forget, non-blocking)
  if (!(order as Record<string, unknown>).admin_viewed_at) {
    supabase
      .from("orders")
      .update({ admin_viewed_at: new Date().toISOString() } as never)
      .eq("id", id)
      .then(() => {});
  }

  const payment = Array.isArray(order.payments) ? order.payments[0] : null;
  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : null;

  let trackingResult: TrackingResult | null = null;
  if (shipment?.awb) {
    const dbSteps = trackingStepsFromHistory(shipment.tracking_history);
    if (dbSteps.length > 0) {
      trackingResult = {
        ok: true,
        waybillId: shipment.awb,
        status: dbSteps[0]?.status ?? "",
        steps: dbSteps,
        link: null,
      };
    } else {
      trackingResult = await fetchBiteshipTracking(shipment.awb, shipment.courier_company ?? "");
    }
  }

  // Expiry: dari payment record, fallback ke created_at + 3 jam
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const adminPaymentExpiry =
    payment?.expiry_time ??
    new Date(new Date(order.created_at).getTime() + THREE_HOURS_MS).toISOString();
  const adminPaymentExpired =
    order.status === "pending_payment" && new Date(adminPaymentExpiry).getTime() <= Date.now();

  // Lazy-cancel: admin membuka halaman → cancel langsung → redirect ke halaman segar
  if (adminPaymentExpired) {
    try {
      await cancelExpiredOrder(order.id);
    } catch {
      // DB error — lanjut render; cron akan retry
    }
    redirect(`/admin/orders/${id}`);
  }

  // Badge untuk payment pending yang kedaluwarsa (belum sempat di-cancel cron)
  const paymentIsExpiredPending = payment?.status === "pending" && adminPaymentExpired;
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const cancelNote =
    order.status === "cancelled"
      ? ((history ?? [])
          .slice()
          .reverse()
          .find((h) => h.status === "cancelled")?.note ?? null)
      : null;

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/orders" className="admin-text-link font-medium">
          Pesanan
        </Link>
        <ChevronRight size={12} className="shrink-0 opacity-60" />
        <span className="font-mono font-semibold text-foreground">{order.order_number}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Transaksi</p>
          <h1 className="font-mono text-[34px] font-semibold text-foreground uppercase">
            {order.order_number}
          </h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            {formatDate(order.created_at, {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase",
              adminOrderStatusBadgeClass(order.status),
            )}
          >
            {ADMIN_ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
          {cancelNote && (
            <p className="max-w-[260px] text-right text-[11px] leading-snug text-red-500/80">
              {cancelNote}
            </p>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Items + Payment + History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Item Pesanan ({items.length})</h2>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 px-4 py-3">
                  {/* Image */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={16} className="text-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <div>
                      <p className="text-sm leading-tight font-semibold">{item.product_name}</p>
                      <p className="mt-0.5 text-xs text-foreground">{item.variant_name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-foreground">
                        SKU: {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{formatRupiah(item.subtotal)}</p>
                      <p className="text-[11px] text-foreground">
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 border-t border-border bg-muted/30 px-4 py-3">
              <Row label="Subtotal" value={formatRupiah(order.subtotal)} />
              <Row
                label={`Ongkir (${order.courier_company ?? "—"} ${order.courier_service ?? ""})`}
                value={formatRupiah(order.shipping_cost)}
              />
              {order.shipping_insurance > 0 && (
                <Row label="Asuransi Pengiriman" value={formatRupiah(order.shipping_insurance)} />
              )}
              {order.discount_amount > 0 && (
                <Row
                  label={`Diskon${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                  value={`-${formatRupiah(order.discount_amount)}`}
                  className="text-emerald-600"
                />
              )}
              <div className="border-t border-border pt-1.5">
                <Row label="Total" value={formatRupiah(order.total)} bold />
              </div>
            </div>
          </section>

          {/* Payment Info */}
          {payment && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Info Pembayaran</h2>
              </div>
              <div className="space-y-2 px-4 py-4">
                <InfoRow
                  label="Status"
                  value={
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                        payment.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-800"
                          : paymentIsExpiredPending
                            ? "bg-destructive/10 text-destructive"
                            : payment.status === "pending"
                              ? "bg-brand/10 text-brand"
                              : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {paymentIsExpiredPending
                        ? "Kedaluwarsa (menunggu cron)"
                        : (PAYMENT_STATUS_LABELS[payment.status] ?? payment.status)}
                    </span>
                  }
                />
                {payment.payment_type && (
                  <InfoRow
                    label="Metode"
                    value={payment.payment_type.replace(/_/g, " ").toUpperCase()}
                  />
                )}
                {payment.va_number && (
                  <InfoRow
                    label="No. VA"
                    value={<span className="font-mono">{payment.va_number}</span>}
                  />
                )}
                {payment.payment_code && (
                  <InfoRow
                    label="Kode Bayar"
                    value={<span className="font-mono">{payment.payment_code}</span>}
                  />
                )}
                {(payment.mayar_transaction_id ?? payment.midtrans_transaction_id) && (
                  <InfoRow
                    label={
                      payment.provider === "mayar"
                        ? "Mayar Transaction ID"
                        : "Midtrans Transaction ID"
                    }
                    value={
                      <span className="font-mono text-[11px]">
                        {payment.mayar_transaction_id ?? payment.midtrans_transaction_id}
                      </span>
                    }
                  />
                )}
                <InfoRow label="Jumlah" value={formatRupiah(payment.gross_amount)} />
                {payment.paid_at && (
                  <InfoRow
                    label="Dibayar"
                    value={formatDate(payment.paid_at, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                )}
                {payment.expiry_time && !payment.paid_at && (
                  <InfoRow
                    label="Batas Bayar"
                    value={formatDate(payment.expiry_time, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                )}
              </div>
            </section>
          )}

          {/* Status History */}
          {history && history.length > 0 && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Riwayat Status</h2>
              </div>
              <div className="px-4 py-4">
                <ol className="space-y-3">
                  {history.map((h, i) => (
                    <li key={h.id} className="flex gap-3">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full border-2",
                            i === history.length - 1
                              ? "border-brand bg-brand"
                              : "border-muted-foreground bg-background",
                          )}
                        />
                        {i < history.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                      </div>
                      {/* Content */}
                      <div className="pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                              adminOrderStatusBadgeClass(h.status),
                            )}
                          >
                            {ADMIN_ORDER_STATUS_LABEL[h.status] ?? h.status}
                          </span>
                          <span className="text-[11px] text-foreground">
                            {formatDate(h.created_at, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {h.note && <p className="mt-1 text-xs text-foreground">{h.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
          {/* Tracking History */}
          {shipment?.awb && trackingResult && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Riwayat Pengiriman</h2>
              </div>
              <div className="px-4 py-4">
                <ShipmentTrackingCard
                  courierName={shipment.courier_name}
                  courierCompany={shipment.courier_company}
                  courierService={shipment.courier_service}
                  awb={shipment.awb}
                  externalLink={trackingResult.ok ? trackingResult.link : null}
                  status={shipment.status}
                  updatedAt={shipment.updated_at}
                  trackingResult={trackingResult}
                />
              </div>
            </section>
          )}
        </div>

        {/* Right: Summary + Actions */}
        <div className="space-y-6">
          {/* Customer & Shipping */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Penerima</h2>
            </div>
            <div className="space-y-2.5 px-4 py-4 text-sm">
              <div className="flex items-start gap-2">
                <User size={13} className="mt-0.5 shrink-0 text-foreground" />
                <span className="font-semibold">{order.recipient_name}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={13} className="mt-0.5 shrink-0 text-foreground" />
                <span className="text-sm">{order.recipient_phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-foreground" />
                <div className="text-sm text-foreground">
                  <p>{order.shipping_address}</p>
                  <p>
                    {order.shipping_district}, {order.shipping_city}
                  </p>
                  <p>
                    {order.shipping_province} {order.shipping_postal}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Courier */}
          {(order.courier_company || shipment) && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Pengiriman</h2>
              </div>
              <div className="space-y-2 px-4 py-4">
                {order.courier_company && (
                  <InfoRow
                    label="Kurir"
                    value={`${order.courier_company.toUpperCase()} — ${order.courier_service ?? ""}`}
                  />
                )}
                {order.courier_etd && (
                  <InfoRow label="Estimasi" value={`${order.courier_etd} hari`} />
                )}
                {shipment?.awb && (
                  <>
                    <InfoRow
                      label="Nomor Resi"
                      value={<span className="font-mono font-semibold">{shipment.awb}</span>}
                    />
                    <Link
                      href={`/admin/print/orders/${order.id}/label`}
                      target="_blank"
                      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <Printer size={13} />
                      Cetak Resi (A5)
                    </Link>
                  </>
                )}
                {shipment?.status && (
                  <InfoRow
                    label="Status Kurir"
                    value={shipment.status.replace(/_/g, " ").toUpperCase()}
                  />
                )}
                {shipment?.biteship_order_id && (
                  <InfoRow
                    label="Biteship ID"
                    value={
                      <span className="font-mono text-[11px]">{shipment.biteship_order_id}</span>
                    }
                  />
                )}
                {shipment?.awb &&
                  shipment.biteship_order_id &&
                  !["delivered", "cancelled", "returned"].includes(shipment.status ?? "") && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] text-muted-foreground">
                        Tarik status terbaru dari Biteship secara manual.
                      </p>
                      <SyncBiteshipButton orderId={order.id} />
                    </div>
                  )}
                {shipment && !shipment.awb && shipment.biteship_order_id && (
                  <div className="space-y-2 pt-1">
                    {order.status === "paid" && shipment.status === "pending" ? (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          Pembayaran diterima. Kemas paket lalu lanjut ke konfirmasi pickup.
                        </p>
                        <StartPackingButton orderId={order.id} />
                      </>
                    ) : order.status === "processing" && shipment.status === "pending" ? (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          Paket terdaftar di Biteship. Konfirmasi siap pickup setelah selesai
                          dikemas.
                        </p>
                        <ConfirmPickupButton orderId={order.id} />
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-muted-foreground">
                          {shipment.status === "confirmed"
                            ? "Paket siap pickup. Kurir akan datang sesuai jadwal. AWB akan muncul otomatis."
                            : "AWB dikirim otomatis via webhook, atau klik sync untuk tarik sekarang."}
                        </p>
                        <SyncBiteshipButton orderId={order.id} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Refund bank info — shown if order cancelled and bank data exists */}
          {order.status === "cancelled" && order.refund_bank_name && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Info Rekening Refund</h2>
              </div>
              <div className="space-y-2 px-4 py-4">
                <InfoRow label="Bank" value={order.refund_bank_name} />
                {order.refund_account_name && (
                  <InfoRow label="Atas Nama" value={order.refund_account_name} />
                )}
                {order.refund_account_number && (
                  <InfoRow
                    label="No. Rekening"
                    value={<span className="font-mono">{order.refund_account_number}</span>}
                  />
                )}
                <p className="mt-1 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                  Mayar tidak menyediakan refund otomatis. Transfer dana manual ke rekening di atas,
                  lalu ubah status pesanan ke <strong>Dikembalikan</strong> — pelanggan otomatis
                  menerima notifikasi dan email refund.
                </p>
              </div>
            </section>
          )}

          {/* Notes */}
          {order.notes && (
            <section className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Catatan</h2>
              </div>
              <p className="px-4 py-3 text-sm text-foreground">{order.notes}</p>
            </section>
          )}

          {/* Status Updater */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Update Status</h2>
            </div>
            <div className="px-4 py-4">
              <StatusUpdater orderId={order.id} currentStatus={order.status as OrderStatus} />
            </div>
          </section>

          {/* AWB Input */}
          <section className="admin-utility-card overflow-hidden p-0">
            <div className="admin-utility-card-header">
              <h2 className="admin-section-title">Input Resi Manual</h2>
            </div>
            <div className="px-4 py-4">
              <AWBForm orderId={order.id} currentAWB={shipment?.awb} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-foreground">{label}</span>
      <span className={cn(bold && "text-sm font-semibold", className)}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 text-xs">
      <span className="shrink-0 text-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
