import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/account/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/guards";
import { CLAIM_STATUS_META, RETURN_STATUS_META } from "@/lib/orders/status";
import { listAdminAfterSales } from "@/server/queries/admin/service";

export const metadata: Metadata = { title: "Retur & garansi" };
export const dynamic = "force-dynamic";

const KINDS = [
  { key: "", label: "Semua" },
  { key: "return", label: "Retur" },
  { key: "claim", label: "Klaim garansi" },
] as const;

const OPEN = new Set([
  "requested",
  "approved",
  "item_shipped",
  "item_received",
  "submitted",
  "in_review",
]);

const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" });

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; open?: string }>;
}) {
  await requireRole(["owner", "admin", "cs"]);
  const sp = await searchParams;
  const kind = sp.kind === "return" || sp.kind === "claim" ? sp.kind : undefined;
  const openOnly = sp.open !== "0";
  const all = await listAdminAfterSales({ kind });
  const rows = openOnly ? all.filter((r) => OPEN.has(r.status)) : all;
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ kind, open: openOnly ? undefined : "0", ...patch }))
      if (v) u.set(k, v);
    return `/admin/returns${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Retur & garansi"
        description="Pengajuan retur (jendela pengembalian) dan klaim garansi dari pelanggan. Setiap perubahan status dikirim sebagai notifikasi."
      />
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <Button
            key={k.key || "all"}
            asChild
            size="sm"
            variant={(kind ?? "") === k.key ? "primary" : "outline"}
          >
            <Link href={qs({ kind: k.key || undefined })}>{k.label}</Link>
          </Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <Button asChild size="sm" variant={openOnly ? "primary" : "outline"}>
          <Link href={qs({ open: undefined })}>Perlu ditangani</Link>
        </Button>
        <Button asChild size="sm" variant={!openOnly ? "primary" : "outline"}>
          <Link href={qs({ open: "0" })}>Termasuk selesai</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title={openOnly ? "Tidak ada yang perlu ditangani" : "Belum ada pengajuan"}
          description="Pengajuan baru dari pelanggan akan muncul di sini."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis</TableHead>
                <TableHead>Produk / alasan</TableHead>
                <TableHead>Pesanan</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Diajukan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const meta =
                  (r.kind === "return" ? RETURN_STATUS_META : CLAIM_STATUS_META)[r.status] ??
                  ({ label: r.status, tone: "neutral" } as const);
                return (
                  <TableRow key={`${r.kind}-${r.id}`}>
                    <TableCell>
                      <Badge variant={r.kind === "return" ? "secondary" : "outline"}>
                        {r.kind === "return" ? "Retur" : "Garansi"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/returns/${r.kind}/${r.id}`}
                        className="flex flex-col hover:underline"
                      >
                        <span className="line-clamp-1 font-medium">
                          {r.productName ?? "Seluruh pesanan"}
                        </span>
                        <span className="line-clamp-1 text-caption text-muted-foreground">
                          {r.reason ?? r.description ?? "-"}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.orderNumber ? (
                        <Link
                          href={`/admin/orders/${r.orderNumber}`}
                          className="font-mono text-sm hover:underline"
                        >
                          {r.orderNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/customers/${r.customerId}`}
                        className="text-sm hover:underline"
                      >
                        {r.customer}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {date.format(new Date(r.createdAt))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
