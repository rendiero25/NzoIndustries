import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/account/status-badge";
import {
  LabelSelectionBar,
  LabelSelectionProvider,
  SelectAllCheckbox,
  SelectOrderCheckbox,
} from "@/components/admin/orders/label-selection";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { ORDER_STATUS_META, orderStatusMeta } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { ADMIN_ORDERS_PER_PAGE, listAdminOrders } from "@/server/queries/admin/orders";
import { LABEL_STATUSES } from "@/server/queries/documents";

export const metadata: Metadata = { title: "Pesanan" };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const FILTERS = [
  "",
  "ready",
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
];

const isPrintable = (status: string) => (LABEL_STATUSES as readonly string[]).includes(status);

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const canPrint = user.role !== "cs";
  const { rows, total, page } = await listAdminOrders({ ...sp, page: Number(sp.page) || 1 });
  const pages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PER_PAGE));
  const printable = rows.filter((o) => isPrintable(o.status)).map((o) => o.orderNumber);
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, q: sp.q, from: sp.from, to: sp.to, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pesanan" description={`${total} pesanan`} />

      <nav aria-label="Filter status" className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <ul className="flex gap-1.5">
          {FILTERS.map((s) => {
            const active = (sp.status ?? "") === s;
            return (
              <li key={s || "all"} className="shrink-0">
                <Link
                  href={qs({ status: s || undefined, page: undefined })}
                  className={cn(
                    "flex h-8 items-center rounded-full border px-3 text-sm whitespace-nowrap",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-steel-700 hover:bg-steel-50",
                  )}
                >
                  {s === "ready"
                    ? "Siap kirim"
                    : s
                      ? ORDER_STATUS_META[s as keyof typeof ORDER_STATUS_META].label
                      : "Semua"}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form className="flex flex-wrap items-end gap-2" action="/admin/orders">
        {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Cari
          <Input
            name="q"
            defaultValue={sp.q}
            placeholder="Nomor pesanan / nama penerima"
            className="h-9 w-64"
          />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Dari
          <Input type="date" name="from" defaultValue={sp.from} className="h-9" />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Sampai
          <Input type="date" name="to" defaultValue={sp.to} className="h-9" />
        </label>
        <Button type="submit" size="sm" variant="outline">
          Terapkan
        </Button>
        {sp.q || sp.from || sp.to ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={qs({ q: undefined, from: undefined, to: undefined, page: undefined })}>
              Reset
            </Link>
          </Button>
        ) : null}
      </form>

      <LabelSelectionProvider>
        {canPrint ? <LabelSelectionBar /> : null}
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {canPrint ? (
                  <TableHead className="w-10">
                    <SelectAllCheckbox orderNumbers={printable} />
                  </TableHead>
                ) : null}
                <TableHead>Pesanan</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Pengiriman</TableHead>
                <TableHead>Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canPrint ? 7 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Tidak ada pesanan.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((o) => {
                  const m = orderStatusMeta(o.status);
                  return (
                    <TableRow key={o.id}>
                      {canPrint ? (
                        <TableCell>
                          {isPrintable(o.status) ? (
                            <SelectOrderCheckbox orderNumber={o.orderNumber} />
                          ) : null}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Link
                          href={`/admin/orders/${o.orderNumber}`}
                          className="font-mono font-semibold hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                        <div className="text-caption text-muted-foreground">
                          {o.itemCount} barang
                        </div>
                      </TableCell>
                      <TableCell>{o.customer}</TableCell>
                      <TableCell>
                        <StatusBadge label={m.label} tone={m.tone} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatIDR(o.grandTotal)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.courier ?? "—"}
                        {o.waybill ? (
                          <div className="font-mono text-caption text-muted-foreground">
                            {o.waybill}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {date.format(new Date(o.createdAt))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </LabelSelectionProvider>

      {pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={qs({ page: page - 1 })}>Sebelumnya</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            Halaman {page} dari {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={qs({ page: page + 1 })}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
