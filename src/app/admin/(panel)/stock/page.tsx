import type { Metadata } from "next";
import Link from "next/link";

import { StockTable } from "@/components/admin/stock/stock-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { getLowStockThreshold } from "@/server/queries/admin/products";
import { listStock, STOCK_PER_PAGE } from "@/server/queries/admin/stock";

export const metadata: Metadata = { title: "Stok" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "Semua" },
  { key: "low", label: "Menipis" },
  { key: "out", label: "Habis" },
  { key: "published", label: "Tayang saja" },
];

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const user = await requireRole(["owner", "admin", "warehouse"]);
  const sp = await searchParams;
  const threshold = await getLowStockThreshold();
  const { rows, total, page } = await listStock({ ...sp, page: Number(sp.page) || 1 }, threshold);
  const pages = Math.max(1, Math.ceil(total / STOCK_PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, filter: sp.filter, ...patch }))
      if (v) u.set(k, v);
    return `/admin/stock${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Stok"
        description={`Stok = cache ledger. Ditahan = reservasi pesanan belum dibayar. Ambang menipis ≤ ${threshold}.`}
      />
      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label="Filter stok" className="flex gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key || "all"}
              href={qs({ filter: f.key || undefined, page: undefined })}
              className={cn(
                "flex h-8 items-center rounded-full border px-3 text-sm",
                (sp.filter ?? "") === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-steel-700 hover:bg-steel-50",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/stock" className="flex gap-2">
          {sp.filter ? <input type="hidden" name="filter" value={sp.filter} /> : null}
          <Input name="q" defaultValue={sp.q} placeholder="Nama / SKU" className="h-9 w-56" />
          <Button type="submit" size="sm" variant="outline">
            Cari
          </Button>
        </form>
      </div>

      <StockTable rows={rows} threshold={threshold} canManageProducts={user.role !== "warehouse"} />

      {pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={qs({ page: String(page - 1) })}>Sebelumnya</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            Halaman {page} dari {pages.toLocaleString("id-ID")}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={qs({ page: String(page + 1) })}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
