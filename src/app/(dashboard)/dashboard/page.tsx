import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Bell, ShoppingBag, Tag, Truck, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { createClient } from "@/lib/supabase/legacy/server";
import {
  fetchDashboardOverview,
  fetchDashboardOrderStats,
  fetchRecentOrdersListPreview,
  fetchUserProfile,
  fetchActiveCouponsForStore,
  fetchSpendingByMonth,
  fetchPendingPaymentOrders,
  fetchUserNotifications,
  fetchPendingReviewsCount,
} from "@/lib/data/dashboard-user";
import { fetchOpenComplaintOrderIds } from "@/lib/data/complaints";
import { formatDate, formatRupiah } from "@/lib/format";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants/order-status-labels";
import { cn } from "@/lib/utils";
import { SpendingChartLazy } from "@/components/dashboard/spending-chart-lazy";
import { PendingPaymentSection } from "@/components/dashboard/pending-payment-section";

export const metadata: Metadata = {
  title: "Ringkasan akun",
  description: "Ringkasan pesanan, notifikasi, dan aktivitas akun NZO Industries Anda.",
};

function statusBadgeClasses(status: OrderStatus): string {
  if (status === "cancelled" || status === "refunded") {
    return "bg-red-50 text-red-700 ring-1 ring-red-100";
  }
  if (status === "shipped" || status === "processing" || status === "paid") {
    return "bg-muted text-warning ring-1 ring-ring/25";
  }
  if (status === "pending_payment") {
    return "bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  }
  return "bg-muted text-foreground ring-1 ring-border";
}

type NotifType = string | null;

function notifIcon(type: NotifType) {
  switch (type) {
    case "order":
    case "order_status":
      return <ShoppingBag className="h-4 w-4" />;
    case "shipping":
    case "shipment":
      return <Truck className="h-4 w-4" />;
    case "promo":
    case "voucher":
    case "coupon":
      return <Tag className="h-4 w-4" />;
    case "completed":
    case "review":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function notifIconBg(type: NotifType): string {
  switch (type) {
    case "order":
    case "order_status":
      return "bg-blue-50 text-blue-600";
    case "shipping":
    case "shipment":
      return "bg-muted text-foreground";
    case "promo":
    case "voucher":
    case "coupon":
      return "bg-green-50 text-green-600";
    case "completed":
    case "review":
      return "bg-purple-50 text-purple-600";
    default:
      return "bg-muted text-steel-700";
  }
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  // 12 calls → 9 calls; order stats consolidated from 6 queries → 1 query (server-parallel-fetching)
  const [
    overview,
    orderStats,
    recentOrders,
    profile,
    coupons,
    spending,
    pendingOrders,
    notifications,
    pendingReviews,
  ] = await Promise.all([
    fetchDashboardOverview(user.id),
    fetchDashboardOrderStats(user.id),
    fetchRecentOrdersListPreview(user.id, 5),
    fetchUserProfile(user.id),
    fetchActiveCouponsForStore(),
    fetchSpendingByMonth(user.id, 12),
    fetchPendingPaymentOrders(user.id, 5),
    fetchUserNotifications(user.id, 5),
    fetchPendingReviewsCount(user.id),
  ]);

  const complaintOrderIds = await fetchOpenComplaintOrderIds(recentOrders.map((o) => o.id));

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ?? user.email?.split("@")[0] ?? "kamu";

  return (
    <div className="w-full">
      <h1 className="text-[28px] leading-[1.14] font-semibold text-foreground sm:text-[32px]">
        Hi, {firstName}! Selamat datang kembali.
      </h1>
      <p className="mt-2 text-base leading-[1.47] text-steel-700">
        Ringkasan pesanan dan aktivitas akun Anda.
      </p>

      {/* Pending payment — real-time client component */}
      <PendingPaymentSection initialOrders={pendingOrders} userId={user.id} />

      {/* Stats cards — row 1: 4 cards, row 2: 2 cards + Total Pesanan (flex-1) */}
      {(() => {
        const compactRupiah = (n: number) => {
          if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
          if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
          return formatRupiah(n);
        };
        // w-[calc(25%-9px)]: 4 cards × 25% + 3 gaps × 12px = 100%
        const cellCls = "shrink-0 w-[calc(50%-6px)] sm:w-[calc(25%-9px)]";
        const cardBody = (label: string, value: string, sub: string, compact?: true) => (
          <>
            <p className="truncate text-[10px] font-semibold text-white/80 uppercase sm:text-[11px]">
              {label}
            </p>
            <p
              className={`mt-2 font-semibold tabular-nums ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl xl:text-4xl"}`}
            >
              {value}
            </p>
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-white/70 sm:text-[11px]">
              {sub}
            </p>
          </>
        );
        return (
          <div className="mt-10 flex flex-col gap-3">
            {/* Row 1 */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/orders"
                className={`${cellCls} overflow-hidden rounded-md bg-primary p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5`}
              >
                {cardBody(
                  "Diproses",
                  String(orderStats.processingCount),
                  "Dibayar, diproses, dikirim",
                )}
              </Link>
              <Link
                href="/dashboard/orders?status=shipped"
                className={`${cellCls} overflow-hidden rounded-md bg-asphalt p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5`}
              >
                {cardBody("Dikirim", String(orderStats.shippedCount), "Dalam pengiriman")}
              </Link>
              <Link
                href="/dashboard/orders?status=completed"
                className={`${cellCls} overflow-hidden rounded-md bg-primary p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5`}
              >
                {cardBody("Selesai", String(orderStats.completedCount), "Pesanan selesai")}
              </Link>
              <Link
                href="/dashboard/orders"
                className={`${cellCls} overflow-hidden rounded-md bg-asphalt p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5`}
              >
                {cardBody(
                  "Total belanja",
                  compactRupiah(orderStats.totalSpending),
                  "Pesanan aktif & selesai",
                  true,
                )}
              </Link>
            </div>
            {/* Row 2 */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/orders?status=completed"
                className={`${cellCls} overflow-hidden rounded-md bg-asphalt p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5`}
              >
                {cardBody("Ulasan tertunda", String(pendingReviews), "Pesanan belum diulas")}
              </Link>
              <Link
                href="/dashboard/wishlist"
                className={`${cellCls} overflow-hidden rounded-md bg-primary p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5`}
              >
                {cardBody("Wishlist", String(overview.wishlistCount), "Produk tersimpan")}
              </Link>
              {/* Total Pesanan — flex-1, mengisi sisa ruang baris 2 */}
              <Link
                href="/dashboard/orders"
                className="min-w-0 flex-1 overflow-hidden rounded-md bg-asphalt p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-5"
              >
                {cardBody("Total pesanan", String(orderStats.totalOrders), "Semua waktu")}
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Spending chart + Notifications — side by side 50/50 on xl */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <SpendingChartLazy data12={spending} />

        {notifications.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-[21px] leading-[1.19] font-semibold text-foreground">
                Notifikasi
              </h2>
              <Link
                href="/dashboard/notifications"
                className="text-[14px] font-medium text-foreground underline-offset-2 hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border px-4 py-3",
                    n.is_read ? "border-border bg-white" : "border-foreground/20 bg-muted",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      notifIconBg(n.type),
                    )}
                  >
                    {notifIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug font-semibold text-foreground">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-steel-700">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-[#aaa]">
                      {formatDate(n.created_at, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Recent orders */}
      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[21px] leading-[1.19] font-semibold text-foreground">
            Pesanan terakhir
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-[14px] font-medium text-foreground underline-offset-2 hover:underline"
          >
            Lihat semua
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-6 text-base leading-[1.47] text-steel-700">Belum ada pesanan.</p>
        ) : (
          <ul className="mt-6 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-2 px-4 py-3 hover:bg-muted motion-safe:transition-colors motion-safe:duration-150 sm:px-5 sm:py-4"
              >
                {complaintOrderIds.has(o.id) && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Pesanan ini sementara sedang dikomplain
                  </div>
                )}
                <div className="flex flex-row items-center gap-3 sm:gap-4">
                  {/* Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-16 sm:w-16">
                    {o.previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.previewImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-[9px] font-semibold text-[#aaa] uppercase">
                          No img
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-foreground sm:text-[13px]">
                          {o.order_number}
                        </p>
                        {o.previewName && (
                          <p className="mt-0.5 truncate text-[12px] text-steel-700 sm:text-[13px]">
                            {o.previewName}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(o.created_at, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                          statusBadgeClasses(o.status),
                        )}
                      >
                        {orderStatusLabel(o.status)}
                      </span>
                    </div>
                  </div>

                  {/* Total + CTA */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-[13px] font-semibold text-foreground tabular-nums sm:text-[14px]">
                      {formatRupiah(o.total)}
                    </p>
                    <Button
                      asChild
                      variant="dark"
                      size="sm"
                      className="group/detail motion-safe:transition-transform motion-safe:duration-[120ms] motion-safe:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-safe:active:scale-[0.95]"
                    >
                      <Link href={`/dashboard/orders/${o.id}`}>
                        <span className="inline-flex items-center gap-1.5">Detail</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active vouchers */}
      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[21px] leading-[1.19] font-semibold text-foreground">
            Voucher aktif
          </h2>
          <Link
            href="/dashboard/vouchers"
            className="text-[14px] font-medium text-foreground underline-offset-2 hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        {coupons.length === 0 ? (
          <p className="mt-6 text-base leading-[1.47] text-steel-700">
            Tidak ada promo aktif saat ini.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {coupons.slice(0, 4).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {c.image_url ? (
                    <Image
                      src={c.image_url}
                      alt={c.title ?? c.code}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Tag className="h-6 w-6 text-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {c.title && (
                    <p className="text-[13px] leading-snug font-semibold text-foreground">
                      {c.title}
                    </p>
                  )}
                  <p
                    className={cn(
                      "font-mono font-black text-foreground",
                      c.title ? "mt-0.5 text-[13px]" : "text-[15px]",
                    )}
                  >
                    {c.code}
                  </p>
                  <p className="mt-0.5 text-[13px] text-steel-700">
                    {c.type === "percentage"
                      ? `Diskon ${c.value}%`
                      : `Potongan Rp${c.value.toLocaleString("id-ID")}`}
                    {c.min_purchase > 0 && ` · min. Rp${c.min_purchase.toLocaleString("id-ID")}`}
                  </p>
                  {c.valid_until && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      s/d {formatDate(c.valid_until)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
