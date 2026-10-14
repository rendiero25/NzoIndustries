import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CUSTOMER_SEGMENTS, type CustomerSegment } from "@/lib/validations/admin-service";
import { CUSTOMERS_PER_PAGE, listAdminCustomers } from "@/server/queries/admin/service";

export const metadata: Metadata = { title: "Pelanggan" };
export const dynamic = "force-dynamic";

const SEGMENTS: { key: CustomerSegment | ""; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "new", label: "Baru (30 hari)" },
  { key: "active", label: "Aktif (90 hari)" },
  { key: "inactive", label: "Tidak aktif" },
  { key: "top", label: "Belanja terbanyak" },
  { key: "blocked", label: "Diblokir" },
];

const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" });

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: string; page?: string }>;
}) {
  await requireRole(["owner", "admin", "cs"]);
  const sp = await searchParams;
  const segment = (CUSTOMER_SEGMENTS as readonly string[]).includes(sp.segment ?? "")
    ? (sp.segment as CustomerSegment)
    : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listAdminCustomers({ q: sp.q, segment, page });
  const pages = Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, segment, ...patch })) if (v) u.set(k, v);
    return `/admin/customers${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pelanggan"
        description="Total belanja dihitung dari pesanan yang sudah dibayar."
      />
      <div className="flex flex-col gap-3">
        <form action="/admin/customers" className="flex max-w-md gap-2">
          {segment ? <input type="hidden" name="segment" value={segment} /> : null}
          <Input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama, email, atau telepon"
            aria-label="Cari pelanggan"
          />
          <Button type="submit" variant="secondary">
            Cari
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <Button
              key={s.key || "all"}
              asChild
              size="sm"
              variant={(segment ?? "") === s.key ? "primary" : "outline"}
            >
              <Link href={qs({ segment: s.key || undefined, page: undefined })}>{s.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tidak ada pelanggan"
          description="Coba kata kunci atau segmen lain."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead className="text-right">Pesanan</TableHead>
                <TableHead className="text-right">Total belanja</TableHead>
                <TableHead>Terakhir belanja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="flex flex-col hover:underline"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {c.fullName || "(tanpa nama)"}
                        {c.isBlocked ? <Badge variant="destructive">Diblokir</Badge> : null}
                        {c.deletedAt ? <Badge variant="outline">Akun dihapus</Badge> : null}
                      </span>
                      <span className="text-caption text-muted-foreground">{c.email}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {date.format(new Date(c.createdAt))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.orderCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatIDR(c.totalSpent)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {c.lastOrderAt ? date.format(new Date(c.lastOrderAt)) : "Belum pernah"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total.toLocaleString("id-ID")} pelanggan · halaman {page} dari {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={qs({ page: String(page - 1) })}>Sebelumnya</Link>
              </Button>
            ) : null}
            {page < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={qs({ page: String(page + 1) })}>Berikutnya</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
