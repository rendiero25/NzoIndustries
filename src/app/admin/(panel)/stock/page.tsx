import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StockFilters } from "./_components/stock-filters";
import { StockVariantsTable, type StockVariantRow } from "./_components/stock-variants-table";
import {
  STOCK_DEFAULT_SORT,
  buildStockVariantCountQuery,
  buildStockVariantListQuery,
  type StockListFilters,
} from "./_lib/stock-query";

export const metadata: Metadata = { title: "Stok — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  alert?: string;
  page?: string;
  q?: string;
  brand?: string;
  category?: string;
  sort?: string;
}>;

type StockHistoryType = "in" | "out" | "reserved" | "released" | "adjustment";

const HISTORY_TYPE_BADGE: Record<StockHistoryType, string> = {
  in: "bg-emerald-500/15 text-emerald-800",
  out: "bg-destructive/10 text-destructive",
  reserved: "bg-brand/10 text-brand",
  released: "bg-muted text-foreground",
  adjustment: "bg-muted text-foreground",
};

const STOCK_HISTORY_HEADERS = ["Tanggal", "Produk / Varian", "Tipe", "Jumlah", "Catatan"] as const;

const HISTORY_TYPE_LABEL: Record<StockHistoryType, string> = {
  in: "Masuk",
  out: "Keluar",
  reserved: "Reserved",
  released: "Released",
  adjustment: "Penyesuaian",
};

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reserved: number;
  is_active: boolean;
  products: { name: string; slug: string } | { name: string; slug: string }[];
};

type HistoryRow = {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product_variants:
    | { name: string; sku: string; products: { name: string } | { name: string }[] }
    | { name: string; sku: string; products: { name: string } | { name: string }[] }[];
};

function parseFilters(params: {
  alert?: string;
  q?: string;
  brand?: string;
  category?: string;
  sort?: string;
}): StockListFilters {
  return {
    q: params.q?.trim() ?? "",
    brandId: params.brand ?? "",
    categoryId: params.category ?? "",
    sort: params.sort ?? STOCK_DEFAULT_SORT,
    alertOnly: params.alert === "1",
  };
}

function buildAlertHref(filters: StockListFilters, enableAlert: boolean): string {
  const params = new URLSearchParams();
  if (enableAlert) params.set("alert", "1");
  if (filters.q) params.set("q", filters.q);
  if (filters.brandId) params.set("brand", filters.brandId);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.sort !== STOCK_DEFAULT_SORT) params.set("sort", filters.sort);
  const qs = params.toString();
  return qs ? `/admin/stock?${qs}` : "/admin/stock";
}

async function fetchStockData(filters: StockListFilters, requestedPage: number) {
  const supabase = await createClient();

  const page = Math.max(1, requestedPage);
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const [countResult, variants, history] = await Promise.all([
    buildStockVariantCountQuery(supabase, filters),
    buildStockVariantListQuery(supabase, filters).range(from, to),
    supabase
      .from("stock_history")
      .select(
        "id, type, quantity, note, created_at, product_variants!inner(name, sku, products!inner(name))",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const totalCount = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  return {
    variants: (variants.data ?? []) as VariantRow[],
    history: (history.data ?? []) as HistoryRow[],
    totalCount,
    totalPages,
    page: Math.min(page, totalPages),
  };
}

function mapVariantRows(rows: VariantRow[]): StockVariantRow[] {
  return rows.map((v) => {
    const productName = Array.isArray(v.products) ? v.products[0]?.name : v.products?.name;
    return {
      id: v.id,
      name: v.name,
      sku: v.sku,
      stock: v.stock,
      reserved: v.reserved,
      productName: productName ?? "",
    };
  });
}

export default async function AdminStockPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const requestedPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const supabase = await createClient();

  const [{ data: categories }, { data: brands }, stockResult] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    fetchStockData(filters, requestedPage),
  ]);

  const { variants, history, totalCount, totalPages, page } = stockResult;
  const stockRows = mapVariantRows(variants);
  const outOfStockCount = stockRows.filter((v) => v.stock === 0).length;

  const filterHint = [
    filters.q ? `untuk "${filters.q}"` : null,
    filters.brandId
      ? `merek ${brands?.find((b) => b.id === filters.brandId)?.name ?? ""}`.trim()
      : null,
    filters.categoryId
      ? `kategori ${categories?.find((c) => c.id === filters.categoryId)?.name ?? ""}`.trim()
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Inventaris</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Stok</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            {totalCount} varian
            {filters.alertOnly ? " stok kritis" : ""}
            {filterHint ? ` ${filterHint}` : ""}
          </p>
        </div>
        <Button
          asChild
          variant={filters.alertOnly ? "primary" : "secondary"}
          size="sm"
          className="shrink-0 gap-2"
        >
          <Link href={buildAlertHref(filters, !filters.alertOnly)}>
            <AlertTriangle size={13} />
            Stok Kritis
          </Link>
        </Button>
      </div>

      <Suspense>
        <StockFilters categories={categories ?? []} brands={brands ?? []} />
      </Suspense>

      {outOfStockCount > 0 ? (
        <div className="admin-utility-card flex items-center gap-3 border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 text-destructive" />
          <p className="text-sm font-semibold text-destructive">
            {outOfStockCount} varian habis stok di halaman ini
          </p>
        </div>
      ) : null}

      <div className="admin-utility-card flex items-start gap-3 border-amber-200 bg-amber-50/70 px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
        <p className="text-sm leading-5 text-amber-950">
          Stok kurang dari <span className="font-semibold">5 unit</span> akan ditandai sebagai stok
          kritis dan menampilkan badge pada menu Stok.
        </p>
      </div>

      <Suspense>
        <StockVariantsTable
          variants={stockRows}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          perPage={PER_PAGE}
        />
      </Suspense>

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Riwayat Stok (50 Terakhir)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] text-left">
                {STOCK_HISTORY_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-[10px] font-semibold whitespace-nowrap text-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-foreground">
                    Belum ada riwayat stok
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const variant = Array.isArray(h.product_variants)
                    ? h.product_variants[0]
                    : h.product_variants;
                  const productName = variant
                    ? Array.isArray(variant.products)
                      ? variant.products[0]?.name
                      : variant.products?.name
                    : null;
                  const typeCls =
                    HISTORY_TYPE_BADGE[h.type as StockHistoryType] ?? HISTORY_TYPE_BADGE.adjustment;
                  const typeLabel = HISTORY_TYPE_LABEL[h.type as StockHistoryType] ?? h.type;

                  return (
                    <tr key={h.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3 text-xs whitespace-nowrap text-foreground">
                        {formatDate(h.created_at, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{productName ?? "—"}</p>
                        {variant ? (
                          <p className="text-xs text-foreground">
                            {variant.name} · {variant.sku}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                            typeCls,
                          )}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground">{h.note ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
