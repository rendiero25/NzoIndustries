import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  PackageCheck,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardOrdersChart, DashboardRevenueChart } from "@/components/admin/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { getDashboardStats } from "@/server/queries/admin/dashboard";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className="h-full transition-colors hover:border-steel-500">
      <CardContent className="flex flex-col gap-2 p-5">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden /> {label}
        </span>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboardPage() {
  await requireStaff();
  const s = await getDashboardStats(30);

  if (!s) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <p className="text-sm text-danger">Statistik gagal dimuat. Muat ulang halaman.</p>
      </div>
    );
  }

  const toProcess = s.byStatus.paid ?? 0;
  const processing = s.byStatus.processing ?? 0;
  const unpaid = s.byStatus.pending_payment ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Ringkasan penjualan dan operasional toko (30 hari terakhir)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Banknote}
          label="Penjualan hari ini"
          value={formatIDR(s.salesToday)}
          hint={`7 hari: ${formatIDR(s.sales7d)}`}
        />
        <Kpi
          icon={Banknote}
          label="Penjualan 30 hari"
          value={formatIDR(s.sales30d)}
          hint={`${s.orders30d} pesanan dibayar`}
        />
        <Kpi
          icon={PackageCheck}
          label="Perlu diproses"
          value={String(toProcess + processing)}
          hint={`${toProcess} baru dibayar · ${processing} sedang diproses`}
          href="/admin/orders?status=paid"
        />
        <Kpi
          icon={AlertTriangle}
          label="Stok menipis"
          value={String(s.lowStockCount)}
          hint={`Ambang ≤ ${s.threshold} · ${s.outOfStockCount.toLocaleString("id-ID")} produk tayang habis`}
          href="/admin/stock?filter=low"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendapatan harian</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardRevenueChart data={s.series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pesanan dibayar per hari</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardOrdersChart data={s.series} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Status pesanan</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/admin/orders">
                Semua <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {[
              { k: "pending_payment", label: "Belum bayar", icon: ShoppingBag, n: unpaid },
              { k: "paid", label: "Dibayar", icon: PackageCheck, n: toProcess },
              { k: "processing", label: "Diproses", icon: PackageCheck, n: processing },
              { k: "shipped", label: "Dikirim", icon: Truck, n: s.byStatus.shipped ?? 0 },
            ].map((r) => (
              <Link
                key={r.k}
                href={`/admin/orders?status=${r.k}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-steel-50"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <r.icon className="size-4" strokeWidth={1.75} aria-hidden /> {r.label}
                </span>
                <span className="font-semibold tabular-nums">{r.n}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produk terlaris (30 hari)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {s.topProducts.length === 0 ? (
              <p className="text-muted-foreground">Belum ada penjualan.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {s.topProducts.map((p, i) => (
                  <li
                    key={`${p.productId}-${i}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="line-clamp-1">
                      {i + 1}. {p.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {p.qty} terjual
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Stok menipis</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/admin/stock?filter=low">
                Kelola <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="text-sm">
            {s.lowStock.length === 0 ? (
              <p className="text-muted-foreground">Tidak ada produk dengan stok menipis.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {s.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/products/${p.id}`} className="line-clamp-1 hover:underline">
                      {p.name}
                    </Link>
                    <span className="shrink-0 font-semibold text-warning tabular-nums">
                      {p.stock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
