import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
  Users,
  XCircle,
} from "lucide-react";

import React, { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardRevenueChart, DashboardOrdersChart } from "@/components/admin/dashboard-charts";
import { AdminNewOrdersSection } from "@/components/admin/admin-new-orders-section";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard Admin" };
export const revalidate = 60; // ISR: refresh data setiap 60 detik

// ----------------------------------------------------------------
// Tipe data
// ----------------------------------------------------------------
type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending_payment: { label: "Menunggu Bayar", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  paid: { label: "Dibayar", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  processing: { label: "Diproses", color: "bg-purple-100 text-purple-800", icon: Package },
  shipped: { label: "Dikirim", color: "bg-indigo-100 text-indigo-800", icon: Truck },
  delivered: { label: "Terkirim", color: "bg-teal-100 text-teal-800", icon: CheckCircle2 },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-800", icon: XCircle },
  refunded: { label: "Refund", color: "bg-gray-100 text-gray-700", icon: AlertTriangle },
};

// ----------------------------------------------------------------
// Module-level constants (avoids re-allocation on every request)
// ----------------------------------------------------------------
const PAID_STATUSES: OrderStatus[] = ["paid", "processing", "shipped", "delivered", "completed"];

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
];

const TABLE_HEADERS = ["No. Order", "Pembeli", "Status", "Total", "Tanggal"] as const;

type StatusCardCfg = {
  label: string;
  icon: React.ElementType;
  accent: string; // border-l color
  iconBg: string;
  iconColor: string;
  bar: string;
};

const STATUS_CARD_CONFIG: Record<OrderStatus, StatusCardCfg> = {
  pending_payment: {
    label: "Menunggu Bayar",
    icon: Clock,
    accent: "border-l-amber-400",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    bar: "bg-amber-400",
  },
  paid: {
    label: "Dibayar",
    icon: CheckCircle2,
    accent: "border-l-emerald-400",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    bar: "bg-emerald-400",
  },
  processing: {
    label: "Diproses",
    icon: Package,
    accent: "border-l-purple-400",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
    bar: "bg-purple-400",
  },
  shipped: {
    label: "Dikirim",
    icon: Truck,
    accent: "border-l-indigo-400",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    bar: "bg-indigo-400",
  },
  delivered: {
    label: "Terkirim",
    icon: CheckCircle2,
    accent: "border-l-teal-400",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
    bar: "bg-teal-400",
  },
  completed: {
    label: "Selesai",
    icon: Star,
    accent: "border-l-green-500",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    bar: "bg-green-500",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: XCircle,
    accent: "border-l-red-400",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    bar: "bg-red-400",
  },
  refunded: {
    label: "Refund",
    icon: AlertTriangle,
    accent: "border-l-zinc-400",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-500",
    bar: "bg-zinc-400",
  },
};

// ----------------------------------------------------------------
// Data fetching — wrapped in cache() for per-request deduplication
// ----------------------------------------------------------------
const fetchDashboardData = cache(async function fetchDashboardData() {
  const supabase = await createClient();

  // All boundaries computed in WIB (UTC+7) so "today" / "this month" match Jakarta time
  const WIB = 7 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const nowWIB = new Date(nowMs + WIB);
  const todayStart = new Date(
    Date.UTC(nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), nowWIB.getUTCDate()) - WIB,
  ).toISOString();
  const weekStart = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(
    Date.UTC(nowWIB.getUTCFullYear(), nowWIB.getUTCMonth(), 1) - WIB,
  ).toISOString();
  const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    revenueToday,
    revenueWeek,
    revenueMonth,
    statusCountResults,
    newCustomersWeek,
    newCustomersMonth,
    lowStockVariants,
    recentOrders,
    recentCustomers,
    recentReviews,
    dailyRevenue,
  ] = await Promise.all([
    // Revenue hari ini
    supabase
      .from("orders")
      .select("total")
      .in("status", PAID_STATUSES)
      .gte("created_at", todayStart),

    // Revenue minggu ini
    supabase
      .from("orders")
      .select("total")
      .in("status", PAID_STATUSES)
      .gte("created_at", weekStart),

    // Revenue bulan ini
    supabase
      .from("orders")
      .select("total")
      .in("status", PAID_STATUSES)
      .gte("created_at", monthStart),

    // Order counts per status — COUNT only, no row data transferred
    Promise.all(
      ALL_STATUSES.map((s) =>
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", s),
      ),
    ),

    // Pelanggan baru minggu ini
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .gte("created_at", weekStart)
      .eq("role", "customer"),

    // Pelanggan baru bulan ini
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .gte("created_at", monthStart)
      .eq("role", "customer"),

    // Low stock variants (stock <= 5)
    supabase
      .from("product_variants")
      .select("id, sku, name, stock, product_id, products!inner(name)")
      .lte("stock", 5)
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .limit(8),

    // Recent orders
    supabase
      .from("orders")
      .select(
        "id, order_number, status, total, created_at, recipient_name, profiles!inner(full_name, id)",
      )
      .order("created_at", { ascending: false })
      .limit(8),

    // Recent customers
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .limit(6),

    // Recent reviews
    supabase
      .from("product_reviews")
      .select("id, rating, comment, created_at, products!inner(name), profiles!inner(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),

    // Daily revenue last 30 days
    supabase
      .from("orders")
      .select("created_at, total")
      .in("status", PAID_STATUSES)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at"),
  ]);

  const sumRevenue = (rows: { total: number }[] | null) =>
    (rows ?? []).reduce((sum, r) => sum + r.total, 0);

  // Aggregate daily data
  const wibKey = (ms: number) => {
    const d = new Date(ms + WIB);
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  };
  const dailyMap: Record<string, { revenue: number; orders: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const key = wibKey(nowMs - i * 24 * 60 * 60 * 1000);
    dailyMap[key] = { revenue: 0, orders: 0 };
  }
  for (const row of dailyRevenue.data ?? []) {
    const key = wibKey(new Date(row.created_at).getTime());
    if (dailyMap[key]) {
      dailyMap[key].revenue += row.total;
      dailyMap[key].orders += 1;
    }
  }
  const dailyChartData = Object.entries(dailyMap).map(([date, v]) => ({
    date,
    ...v,
  }));

  // Order status counts — assembled from per-status COUNT results
  const statusCounts: Partial<Record<OrderStatus, number>> = {};
  let totalOrders = 0;
  ALL_STATUSES.forEach((s, i) => {
    const c = statusCountResults[i].count ?? 0;
    statusCounts[s] = c;
    totalOrders += c;
  });

  return {
    stats: {
      revenueToday: sumRevenue(revenueToday.data),
      revenueWeek: sumRevenue(revenueWeek.data),
      revenueMonth: sumRevenue(revenueMonth.data),
      totalOrders,
      newCustomersWeek: newCustomersWeek.count ?? 0,
      newCustomersMonth: newCustomersMonth.count ?? 0,
    },
    statusCounts,
    lowStockVariants: lowStockVariants.data ?? [],
    recentOrders: recentOrders.data ?? [],
    recentCustomers: recentCustomers.data ?? [],
    recentReviews: recentReviews.data ?? [],
    dailyChartData,
  };
});

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------
export default async function AdminDashboardPage() {
  const {
    stats,
    statusCounts,
    lowStockVariants,
    recentOrders,
    recentCustomers,
    recentReviews,
    dailyChartData,
  } = await fetchDashboardData();

  return (
    <div className="w-full space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <p className="text-swiss-eyebrow !tracking-normal">Overview</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Dashboard</h1>
      </div>

      {/* ── New Orders (real-time, client) ─────────────────────── */}
      <AdminNewOrdersSection />

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue Hari Ini"
          value={formatRupiah(stats.revenueToday, true)}
          sub={formatRupiah(stats.revenueToday)}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Revenue Minggu Ini"
          value={formatRupiah(stats.revenueWeek, true)}
          sub={formatRupiah(stats.revenueWeek)}
          icon={TrendingUp}
        />
        <StatCard
          label="Revenue Bulan Ini"
          value={formatRupiah(stats.revenueMonth, true)}
          sub={formatRupiah(stats.revenueMonth)}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Pesanan"
          value={stats.totalOrders.toString()}
          sub={`${stats.newCustomersMonth} pelanggan baru bulan ini`}
          icon={ShoppingBag}
        />
      </div>

      {/* ── Order Status Breakdown ──────────────────────────────── */}
      <div>
        <h2 className="admin-section-title mb-4">Status Pesanan</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(STATUS_CARD_CONFIG) as [OrderStatus, StatusCardCfg][]).map(
            ([status, cfg]) => {
              const count = statusCounts[status] ?? 0;
              const pct = stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0;
              const pctDisplay = pct < 1 && pct > 0 ? "<1" : Math.round(pct).toString();
              const Icon = cfg.icon;
              return (
                <Link key={status} href={`/admin/orders?status=${status}`} className="group">
                  <Card className="relative cursor-pointer overflow-hidden py-0 transition-all duration-200 hover:bg-[#EA5329]/15">
                    <CardContent className="px-4 py-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                          {cfg.label}
                        </p>
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                            cfg.iconBg,
                          )}
                        >
                          <Icon size={14} className={cfg.iconColor} />
                        </div>
                      </div>
                      {/* Count */}
                      <p className="mt-2 text-[32px] leading-none font-black tracking-tight text-foreground tabular-nums">
                        {count.toLocaleString("id-ID")}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-3 space-y-1">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", cfg.bar)}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {pctDisplay}% dari total
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            },
          )}
        </div>
      </div>

      {/* ── Charts + Side Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="admin-utility-card space-y-3 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="admin-section-title">Revenue — 30 Hari Terakhir</h2>
          </div>
          <DashboardRevenueChart data={dailyChartData} />
        </div>

        {/* Side stats */}
        <div className="flex flex-col gap-4">
          {/* Orders chart */}
          <div className="admin-utility-card flex flex-1 flex-col space-y-3 p-5">
            <h2 className="admin-section-title">Order — 30 Hari Terakhir</h2>
            <DashboardOrdersChart data={dailyChartData} />
          </div>

          {/* Pelanggan */}
          <div className="admin-utility-card flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10">
              <Users size={18} className="text-brand" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats.newCustomersWeek}</p>
              <p className="text-[13px] text-foreground">Pelanggan baru minggu ini</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Low Stock ───────────────────────────────────────────── */}
      {lowStockVariants.length > 0 && (
        <div className="admin-utility-card">
          <div className="admin-utility-card-header">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle size={14} className="text-brand" />
              Stok hampir habis
            </h2>
            <Link
              href="/admin/products?filter=low_stock"
              className="admin-text-link inline-flex items-center gap-1 text-[13px]"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#e0e0e0]">
            {lowStockVariants.map(
              (v: {
                id: string;
                sku: string;
                name: string;
                stock: number;
                product_id: string;
                products: { name: string } | { name: string }[];
              }) => {
                const productName = Array.isArray(v.products)
                  ? v.products[0]?.name
                  : v.products?.name;
                return (
                  <div key={v.id} className="flex items-center justify-between px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{productName}</p>
                      <p className="text-xs text-foreground">
                        {v.sku} · {v.name}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "ml-4 shrink-0 px-2 py-0.5 text-xs font-black",
                        v.stock === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700",
                      )}
                    >
                      {v.stock === 0 ? "Habis" : `${v.stock} sisa`}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* ── Recent Orders ───────────────────────────────────────── */}
      <div className="admin-utility-card">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Pesanan Terbaru</h2>
          <Link
            href="/admin/orders"
            className="admin-text-link inline-flex items-center gap-1 text-[13px]"
          >
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] text-left">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap text-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-foreground">
                    Belum ada pesanan
                  </td>
                </tr>
              ) : (
                recentOrders.map(
                  (order: {
                    id: string;
                    order_number: string;
                    status: string;
                    total: number;
                    created_at: string;
                    recipient_name: string;
                    profiles:
                      | { full_name: string | null; id: string }
                      | { full_name: string | null; id: string }[];
                  }) => {
                    const status = order.status as OrderStatus;
                    const cfg = ORDER_STATUS_CONFIG[status];
                    const Icon = cfg?.icon;
                    const buyerName = Array.isArray(order.profiles)
                      ? order.profiles[0]?.full_name
                      : order.profiles?.full_name;
                    return (
                      <tr key={order.id} className="transition-swiss hover:bg-muted/50">
                        <td className="px-5 py-3 font-mono text-xs font-semibold">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-brand transition-opacity hover:opacity-80"
                          >
                            {order.order_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-sm">{buyerName ?? order.recipient_name}</td>
                        <td className="px-5 py-3">
                          {cfg && (
                            <span
                              className={cn(
                                "flex w-fit items-center gap-1 px-2 py-0.5 text-xs font-semibold",
                                cfg.color,
                              )}
                            >
                              <Icon size={10} />
                              {cfg.label}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-semibold whitespace-nowrap">
                          {formatRupiah(order.total)}
                        </td>
                        <td className="px-5 py-3 text-xs whitespace-nowrap text-foreground">
                          {formatRelativeDate(order.created_at)}
                        </td>
                      </tr>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom row: Pelanggan Baru + Ulasan ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pelanggan baru */}
        <div className="admin-utility-card">
          <div className="admin-utility-card-header">
            <h2 className="admin-section-title">Pelanggan Baru</h2>
            <Link
              href="/admin/customers"
              className="admin-text-link inline-flex items-center gap-1 text-[13px]"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-[#e0e0e0]">
            {recentCustomers.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-foreground">Belum ada pelanggan</li>
            ) : (
              recentCustomers.map(
                (c: { id: string; full_name: string | null; created_at: string }) => {
                  const initials = c.full_name
                    ? c.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "?";
                  return (
                    <li
                      key={c.id}
                      className="transition-swiss flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-black text-foreground">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {c.full_name ?? "Tanpa nama"}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs whitespace-nowrap text-foreground">
                        {formatRelativeDate(c.created_at)}
                      </p>
                    </li>
                  );
                },
              )
            )}
          </ul>
        </div>

        {/* Ulasan terbaru */}
        <div className="admin-utility-card">
          <div className="admin-utility-card-header">
            <h2 className="admin-section-title">Ulasan Terbaru</h2>
            <Link
              href="/admin/reviews"
              className="admin-text-link inline-flex items-center gap-1 text-[13px]"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-[#e0e0e0]">
            {recentReviews.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-foreground">Belum ada ulasan</li>
            ) : (
              recentReviews.map(
                (r: {
                  id: string;
                  rating: number;
                  comment: string | null;
                  created_at: string;
                  products: { name: string } | { name: string }[];
                  profiles: { full_name: string | null } | { full_name: string | null }[];
                }) => {
                  const productName = Array.isArray(r.products)
                    ? r.products[0]?.name
                    : r.products?.name;
                  const reviewerName = Array.isArray(r.profiles)
                    ? r.profiles[0]?.full_name
                    : r.profiles?.full_name;
                  return (
                    <li
                      key={r.id}
                      className="transition-swiss space-y-1 px-5 py-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{productName}</p>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={10}
                              className={
                                i < r.rating ? "fill-yellow-500 text-yellow-500" : "text-foreground"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="line-clamp-1 text-xs text-foreground">{r.comment ?? "—"}</p>
                      <p className="text-xs text-foreground">{reviewerName}</p>
                    </li>
                  );
                },
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Helper component ────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-3 p-6",
        accent
          ? "rounded-lg border border-brand bg-brand text-white active:scale-[0.98]"
          : "admin-utility-card active:scale-[0.98]",
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase",
            accent ? "text-white/85" : "text-foreground",
          )}
        >
          {label}
        </p>
        <Icon size={16} className={accent ? "text-white/80" : "text-brand/80"} strokeWidth={1.5} />
      </div>
      <p className="text-3xl leading-none font-semibold">{value}</p>
      <p
        className={cn(
          "truncate text-xs leading-relaxed",
          accent ? "text-white/75" : "text-foreground",
        )}
      >
        {sub}
      </p>
    </div>
  );
}
