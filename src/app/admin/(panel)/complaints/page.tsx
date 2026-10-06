import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/legacy/server";
import { ComplaintFilters } from "./_components/complaint-filters";
import { ComplaintTable, type ComplaintRow } from "./_components/complaint-table";

export const metadata: Metadata = { title: "Komplain · Admin" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("complaints")
    .select(
      `id, type, reason, status, created_at, resolved_at,
       orders:order_id (order_number),
       profiles:user_id (full_name)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (q) {
    query = query.or(`reason.ilike.%${q}%`);
  }

  const [{ data: complaints, count }, openCount] = await Promise.all([
    query,
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Layanan</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Komplain</h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            {count ?? 0} komplain
            {q ? ` untuk "${q}"` : ""}
            {status ? ` · filter: ${status.replace("_", " ")}` : ""}
          </p>
        </div>
        {(openCount.count ?? 0) > 0 && (
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand/10 px-4 py-2 text-xs font-semibold text-brand uppercase">
            {openCount.count} komplain baru
          </div>
        )}
      </div>

      <Suspense>
        <ComplaintFilters />
      </Suspense>

      <Suspense>
        <ComplaintTable
          complaints={(complaints ?? []) as ComplaintRow[]}
          page={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
