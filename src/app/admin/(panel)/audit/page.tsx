import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { nativeSelectClass } from "@/components/admin/form-styles";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth/guards";
import { AUDIT_PER_PAGE, listAuditLogs } from "@/server/queries/admin/system";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const ENTITY_LABEL: Record<string, string> = {
  products: "Produk",
  product_variants: "Varian",
  product_categories: "Kategori produk",
  product_images: "Foto produk",
  product_fitments: "Kecocokan",
  product_specs: "Spesifikasi",
  categories: "Kategori",
  brands: "Brand",
  vehicle_makes: "Merek kendaraan",
  vehicle_models: "Model kendaraan",
  inventory_movements: "Stok",
  orders: "Pesanan",
  payments: "Pembayaran",
  shipments: "Pengiriman",
  vouchers: "Voucher",
  flash_sales: "Flash sale",
  flash_sale_items: "Item flash sale",
  banners: "Banner",
  content_pages: "Halaman statis",
  reviews: "Ulasan",
  returns: "Retur",
  warranty_claims: "Klaim garansi",
  profiles: "Akun",
  store_settings: "Pengaturan",
  import_batches: "Import",
};

const ACTION: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> =
  {
    insert: { label: "Tambah", variant: "secondary" },
    update: { label: "Ubah", variant: "outline" },
    delete: { label: "Hapus", variant: "destructive" },
  };

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "medium",
});

/** Field yang berubah antara before/after (hanya untuk update). */
function changedFields(
  before: unknown,
  after: unknown,
): { key: string; from: unknown; to: unknown }[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  return [...new Set([...Object.keys(b), ...Object.keys(a)])]
    .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => ({ key: k, from: b[k], to: a[k] }));
}

function short(v: unknown): string {
  const s = v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireRole(["owner", "admin"]);
  const sp = await searchParams;
  const entity = sp.entity && sp.entity in ENTITY_LABEL ? sp.entity : undefined;
  const action = sp.action && sp.action in ACTION ? sp.action : undefined;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : undefined;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listAuditLogs({ entity, action, from, to, page });
  const pages = Math.max(1, Math.ceil(total / AUDIT_PER_PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ entity, action, from, to, page: String(p) }))
      if (v) u.set(k, v);
    return `/admin/audit?${u}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Catatan setiap perubahan data oleh staf dan sistem. Tidak bisa diubah atau dihapus."
      />
      <form action="/admin/audit" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-entity">Data</Label>
          <select
            id="a-entity"
            name="entity"
            defaultValue={entity ?? ""}
            className={`${nativeSelectClass} w-48`}
          >
            <option value="">Semua</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-action">Aksi</Label>
          <select
            id="a-action"
            name="action"
            defaultValue={action ?? ""}
            className={`${nativeSelectClass} w-32`}
          >
            <option value="">Semua</option>
            {Object.entries(ACTION).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-from">Dari</Label>
          <Input id="a-from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="a-to">Sampai</Label>
          <Input id="a-to" name="to" type="date" defaultValue={to} />
        </div>
        <Button type="submit">Filter</Button>
        {entity || action || from || to ? (
          <Button asChild variant="ghost">
            <Link href="/admin/audit">Reset</Link>
          </Button>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="Tidak ada catatan"
          description="Ubah filter untuk melihat catatan lain."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => {
            const a = ACTION[r.action] ?? { label: r.action, variant: "outline" as const };
            const changes = r.action === "update" ? changedFields(r.before, r.after) : [];
            return (
              <li key={r.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={a.variant}>{a.label}</Badge>
                  <span className="font-medium">{ENTITY_LABEL[r.entityType] ?? r.entityType}</span>
                  {r.entityId ? (
                    <span className="font-mono text-caption text-muted-foreground">
                      {r.entityId}
                    </span>
                  ) : null}
                  <span className="ml-auto text-caption text-muted-foreground">
                    {r.actor}
                    {r.actorRole ? ` (${r.actorRole})` : ""} · {date.format(new Date(r.createdAt))}
                  </span>
                </div>
                {changes.length ? (
                  <ul className="flex flex-col gap-0.5 text-caption">
                    {changes.slice(0, 8).map((c) => (
                      <li key={c.key} className="flex flex-wrap gap-1">
                        <span className="font-mono text-muted-foreground">{c.key}:</span>
                        <span className="line-through decoration-danger/60">{short(c.from)}</span>
                        <span aria-hidden>→</span>
                        <span>{short(c.to)}</span>
                      </li>
                    ))}
                    {changes.length > 8 ? (
                      <li className="text-muted-foreground">+{changes.length - 8} field lain</li>
                    ) : null}
                  </ul>
                ) : null}
                <details className="text-caption">
                  <summary className="cursor-pointer text-muted-foreground">Data lengkap</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 font-mono whitespace-pre-wrap">
                      {r.before ? JSON.stringify(r.before, null, 2) : "—"}
                    </pre>
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 font-mono whitespace-pre-wrap">
                      {r.after ? JSON.stringify(r.after, null, 2) : "—"}
                    </pre>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total.toLocaleString("id-ID")} catatan · halaman {page} dari {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={qs(page - 1)}>Sebelumnya</Link>
              </Button>
            ) : null}
            {page < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={qs(page + 1)}>Berikutnya</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
