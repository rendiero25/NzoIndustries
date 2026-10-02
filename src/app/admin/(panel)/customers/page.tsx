import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient, createServiceClient } from "@/lib/supabase/legacy/server";
import { CustomerFilters } from "./_components/customer-filters";
import { CustomerTable, type CustomerRow } from "./_components/customer-table";

export const metadata: Metadata = { title: "Kelola Pelanggan — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  sort?: string;
  page?: string;
}>;

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sort = params.sort ?? "newest";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role, created_at", { count: "exact" })
    .neq("role", "admin")
    .is("deleted_at", null)
    .range(from, to);

  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name_asc":
      query = query.order("full_name", { ascending: true, nullsFirst: false });
      break;
    case "name_desc":
      query = query.order("full_name", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: profiles, count } = await query;

  const userIds = profiles?.map((p) => p.id) ?? [];

  // Fetch emails, order counts, and total spent in parallel
  const serviceClient = createServiceClient();
  const [emailResults, ordersResult] = await Promise.all([
    Promise.all(userIds.map((id) => serviceClient.auth.admin.getUserById(id))),
    userIds.length > 0
      ? supabase
          .from("orders")
          .select("user_id, total")
          .in("user_id", userIds)
          .not("status", "in", "(cancelled,refunded)")
      : Promise.resolve({ data: [] }),
  ]);

  const emailMap: Record<string, string> = {};
  for (const { data } of emailResults) {
    if (data.user?.id && data.user?.email) {
      emailMap[data.user.id] = data.user.email;
    }
  }

  const orderCountMap: Record<string, number> = {};
  const totalSpentMap: Record<string, number> = {};
  for (const o of ordersResult.data ?? []) {
    if (o.user_id) {
      orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1;
      totalSpentMap[o.user_id] = (totalSpentMap[o.user_id] ?? 0) + (o.total ?? 0);
    }
  }

  let customers: CustomerRow[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? null,
    order_count: orderCountMap[p.id] ?? 0,
    total_spent: totalSpentMap[p.id] ?? 0,
  }));

  if (sort === "spent_desc") {
    customers = customers.sort((a, b) => b.total_spent - a.total_spent);
  } else if (sort === "orders_desc") {
    customers = customers.sort((a, b) => b.order_count - a.order_count);
  }

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Pengguna</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Pelanggan</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          {count ?? 0} pelanggan{q ? ` untuk "${q}"` : ""}
        </p>
      </div>

      <Suspense>
        <CustomerFilters />
      </Suspense>

      <Suspense>
        <CustomerTable customers={customers} page={page} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}
