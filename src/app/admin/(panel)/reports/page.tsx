import { Download } from "lucide-react";
import type { Metadata } from "next";

import { DashboardOrdersChart, DashboardRevenueChart } from "@/components/admin/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { nativeSelectClass } from "@/components/admin/form-styles";
import { requireRole } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { reportRangeSchema, shiftDate, wibToday } from "@/lib/validations/admin-system";
import { getSalesReport } from "@/server/queries/admin/system";

export const metadata: Metadata = { title: "Laporan" };
export const dynamic = "force-dynamic";

const PRESETS = [
  { label: "7 hari", days: 6 },
  { label: "30 hari", days: 29 },
  { label: "90 hari", days: 89 },
];

const PAYMENT_LABEL: Record<string, string> = {
  mayar: "Mayar",
  test: "Simulator (dev)",
  manual_transfer: "Transfer manual",
  lainnya: "Lainnya",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; group?: string }>;
}) {
  await requireRole(["owner", "admin"]);
  const sp = await searchParams;
  const today = wibToday();
  const parsed = reportRangeSchema.safeParse({
    from: sp.from ?? shiftDate(today, -29),
    to: sp.to ?? today,
    group: sp.group === "month" ? "month" : "day",
  });
  const range = parsed.success
    ? parsed.data
    : { from: shiftDate(today, -29), to: today, group: "day" as const };
  const report = await getSalesReport(range);
  const t = report.totals;
  const qs = new URLSearchParams({ from: range.from, to: range.to, group: range.group }).toString();
  const series = report.series.map((s) => ({
    date: s.period,
    revenue: s.revenue,
    orders: s.orders,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan"
        description="Penjualan dari pesanan yang sudah dibayar (tidak termasuk batal, kedaluwarsa, dan refund). Tanggal dalam WIB."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <form action="/admin/reports" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-from">Dari</Label>
              <Input id="r-from" name="from" type="date" defaultValue={range.from} max={today} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-to">Sampai</Label>
              <Input id="r-to" name="to" type="date" defaultValue={range.to} max={today} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-group">Per</Label>
              <select
                id="r-group"
                name="group"
                defaultValue={range.group}
                className={nativeSelectClass}
              >
                <option value="day">Hari</option>
                <option value="month">Bulan</option>
              </select>
            </div>
            <Button type="submit">Tampilkan</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.label} asChild variant="outline" size="sm">
                <a href={`/admin/reports?from=${shiftDate(today, -p.days)}&to=${today}`}>
                  {p.label}
                </a>
              </Button>
            ))}
          </div>
          <Button asChild variant="secondary" className="ml-auto">
            <a href={`/admin/reports/export?${qs}`}>
              <Download /> Export XLSX
            </a>
          </Button>
        </CardContent>
      </Card>
      {!parsed.success ? (
        <p className="text-sm text-danger">
          {parsed.error.issues[0]?.message} Menampilkan 30 hari terakhir.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Pendapatan",
            value: formatIDR(t.revenue),
            hint: `Ongkir ${formatIDR(t.shipping)}`,
          },
          { label: "Pesanan dibayar", value: t.orders.toLocaleString("id-ID") },
          { label: "Barang terjual", value: t.items.toLocaleString("id-ID") },
          {
            label: "Rata-rata per pesanan",
            value: formatIDR(t.orders ? Math.round(t.revenue / t.orders) : 0),
            hint: `Diskon ${formatIDR(t.discount)}`,
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex flex-col gap-1 p-5">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <span className="text-2xl font-bold tabular-nums">{k.value}</span>
              {k.hint ? <span className="text-caption text-muted-foreground">{k.hint}</span> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pendapatan per {range.group === "day" ? "hari" : "bulan"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardRevenueChart data={series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pesanan per {range.group === "day" ? "hari" : "bulan"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardOrdersChart data={series} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produk terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportTable
              rows={report.products
                .slice(0, 20)
                .map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue }))}
              empty="Belum ada penjualan di periode ini."
            />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable rows={report.categories} empty="Belum ada data." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per metode bayar</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTable
                rows={report.payments.map((p) => ({
                  name: PAYMENT_LABEL[p.method] ?? p.method.toUpperCase(),
                  qty: p.orders,
                  revenue: p.revenue,
                }))}
                qtyLabel="Pesanan"
                empty="Belum ada data."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReportTable({
  rows,
  empty,
  qtyLabel = "Qty",
}: {
  rows: { name: string; qty: number; revenue: number }[];
  empty: string;
  qtyLabel?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">{qtyLabel}</TableHead>
            <TableHead className="text-right">Pendapatan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.name}-${i}`}>
              <TableCell className="max-w-72 truncate" title={r.name}>
                {r.name}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.qty.toLocaleString("id-ID")}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">
                {formatIDR(r.revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
