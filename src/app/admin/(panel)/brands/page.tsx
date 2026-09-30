import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { BrandFilters } from "./_components/brand-filters";
import { BrandTable, type BrandRow } from "./_components/brand-table";

export const metadata: Metadata = { title: "Kelola Merek — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminBrandsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  let query = supabase
    .from("brands")
    .select("id, name, slug, logo_url, is_active, created_at", {
      count: "exact",
    })
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data: brands, count } = await query.range(from, to);
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Katalog</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Merek</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            {count ?? 0} merek{q ? ` untuk "${q}"` : ""}
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/brands/new">
            <Plus size={14} strokeWidth={2} />
            Tambah Merek
          </Link>
        </Button>
      </div>

      <Suspense>
        <BrandFilters />
      </Suspense>

      <Suspense>
        <BrandTable
          brands={(brands ?? []) as BrandRow[]}
          page={page}
          totalPages={totalPages}
          totalCount={count ?? 0}
          perPage={PER_PAGE}
        />
      </Suspense>
    </div>
  );
}
