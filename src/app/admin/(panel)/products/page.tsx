import { Download, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductTable } from "@/components/admin/products/product-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/guards";
import {
  ADMIN_PRODUCTS_PER_PAGE,
  getLowStockThreshold,
  getProductFormOptions,
  listAdminProducts,
} from "@/server/queries/admin/products";

export const metadata: Metadata = { title: "Produk" };
export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  status?: string;
  brand?: string;
  category?: string;
  stock?: string;
  photo?: string;
  page?: string;
};

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole(["owner", "admin"]);
  const sp = await searchParams;
  const [threshold, options] = await Promise.all([getLowStockThreshold(), getProductFormOptions()]);
  const { rows, total, page } = await listAdminProducts(
    { ...sp, page: Number(sp.page) || 1 },
    threshold,
  );
  const pages = Math.max(1, Math.ceil(total / ADMIN_PRODUCTS_PER_PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, page: p > 1 ? String(p) : undefined }))
      if (v) u.set(k, v);
    return `/admin/products${u.size ? `?${u}` : ""}`;
  };
  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Produk"
        description={`${total.toLocaleString("id-ID")} produk`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/admin/products/export${exportQs.size ? `?${exportQs}` : ""}`}>
                <Download className="size-4" /> Export XLSX
              </a>
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="size-4" /> Tambah produk
              </Link>
            </Button>
          </>
        }
      />

      <form action="/admin/products" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Cari
          <Input name="q" defaultValue={sp.q} placeholder="Nama / SKU" className="h-9 w-56" />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Status
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass}>
            <option value="">Semua</option>
            <option value="published">Tayang</option>
            <option value="draft">Draft</option>
            <option value="archived">Arsip</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Brand
          <select name="brand" defaultValue={sp.brand ?? ""} className={`${selectClass} max-w-44`}>
            <option value="">Semua</option>
            {options.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Kategori
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            className={`${selectClass} max-w-52`}
          >
            <option value="">Semua</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.depth)}
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Stok
          <select name="stock" defaultValue={sp.stock ?? ""} className={selectClass}>
            <option value="">Semua</option>
            <option value="low">Menipis (≤ {threshold})</option>
            <option value="out">Habis</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted-foreground">
          Foto
          <select name="photo" defaultValue={sp.photo ?? ""} className={selectClass}>
            <option value="">Semua</option>
            <option value="none">Belum ada foto</option>
          </select>
        </label>
        <Button type="submit" size="sm" variant="outline">
          Terapkan
        </Button>
        {Object.values(sp).some(Boolean) ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/products">Reset</Link>
          </Button>
        ) : null}
      </form>

      <ProductTable
        rows={rows}
        brands={options.brands}
        categories={options.categories}
        lowThreshold={threshold}
      />

      {pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={qs(page - 1)}>Sebelumnya</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            Halaman {page} dari {pages.toLocaleString("id-ID")}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={qs(page + 1)}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
