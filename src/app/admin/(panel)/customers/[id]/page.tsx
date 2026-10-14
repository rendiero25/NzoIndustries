import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StatusBadge } from "@/components/account/status-badge";
import { BlockCustomerButton } from "@/components/admin/service/service-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { orderStatusMeta } from "@/lib/orders/status";
import { getAdminCustomer } from "@/server/queries/admin/service";

export const metadata: Metadata = { title: "Detail pelanggan" };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" });

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["owner", "admin", "cs"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await getAdminCustomer(id);
  if (!c) notFound();
  const canBlock = user.role === "owner" || user.role === "admin";
  const name = c.fullName || c.email;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/customers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Semua pelanggan
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold">
            {c.fullName || "(tanpa nama)"}
            {c.isBlocked ? <Badge variant="destructive">Diblokir</Badge> : null}
            {c.deletedAt ? <Badge variant="outline">Akun dihapus</Badge> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {c.email}
            {c.phone ? ` · ${c.phone}` : ""} · bergabung {date.format(new Date(c.createdAt))}
          </p>
        </div>
        {canBlock && !c.deletedAt ? (
          <BlockCustomerButton userId={c.id} blocked={c.isBlocked} name={name} />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pesanan dibayar", value: String(c.orderCount) },
          { label: "Total belanja", value: formatIDR(c.totalSpent) },
          {
            label: "Terakhir belanja",
            value: c.lastOrderAt ? date.format(new Date(c.lastOrderAt)) : "Belum pernah",
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex flex-col gap-1 p-5">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <span className="text-xl font-bold tabular-nums">{k.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            {c.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.orders.map((o) => {
                      const meta = orderStatusMeta(o.status);
                      return (
                        <TableRow key={o.orderNumber}>
                          <TableCell>
                            <Link
                              href={`/admin/orders/${o.orderNumber}`}
                              className="font-mono text-sm hover:underline"
                            >
                              {o.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {date.format(new Date(o.createdAt))}
                          </TableCell>
                          <TableCell>
                            <StatusBadge label={meta.label} tone={meta.tone} />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap tabular-nums">
                            {formatIDR(o.grandTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alamat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {c.addresses.length === 0 ? (
              <p className="text-muted-foreground">Belum ada alamat.</p>
            ) : (
              c.addresses.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-0.5 rounded-lg border border-border p-3"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {a.label || a.recipient}
                    {a.isDefault ? <Badge variant="secondary">Utama</Badge> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {a.recipient} · {a.phone}
                  </span>
                  <span className="text-muted-foreground">{a.line}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
