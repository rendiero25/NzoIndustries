import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/legacy/server";
import { OrderFilters } from "./_components/order-filters";
import { OrderTable, type OrderRow } from "./_components/order-table";

export const metadata: Metadata = { title: "Kelola Pesanan — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  sort?: string;
  page?: string;
}>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const sort = params.sort ?? "newest";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, total, created_at, recipient_name, courier_company, courier_service",
      { count: "exact" },
    )
    .range(from, to);

  if (q) query = query.or(`order_number.ilike.%${q}%,recipient_name.ilike.%${q}%`);
  if (status) query = query.eq("status", status as "pending_payment");

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "total_desc":
      query = query.order("total", { ascending: false });
      break;
    case "total_asc":
      query = query.order("total", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Transaksi</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Pesanan</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          {count ?? 0} pesanan{q ? ` untuk "${q}"` : ""}
          {status ? ` · filter: ${status.replace("_", " ")}` : ""}
        </p>
      </div>

      {/* Filters */}
      <Suspense>
        <OrderFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <OrderTable orders={(orders ?? []) as OrderRow[]} page={page} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}
