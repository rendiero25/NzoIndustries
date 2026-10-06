import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { CategoryFilters } from "./_components/category-filters";
import { CategoryTable } from "./_components/category-table";
import { buildFlatCategoryTree, type CategoryRow } from "./_lib/flat-category-tree";

export const metadata: Metadata = { title: "Kelola Kategori · Admin" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";

  const supabase = await createClient();

  let query = supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data: categories } = await query;

  const flatRows = buildFlatCategoryTree((categories ?? []) as CategoryRow[]);
  const totalCount = flatRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(params.page ?? "1", 10)), totalPages);
  const from = (page - 1) * PER_PAGE;
  const pagedRows = flatRows.slice(from, from + PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Katalog</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Kategori</h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            {totalCount} kategori{q ? ` untuk "${q}"` : ""}
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/categories/new">
            <Plus size={14} strokeWidth={2} />
            Tambah Kategori
          </Link>
        </Button>
      </div>

      <Suspense>
        <CategoryFilters />
      </Suspense>

      <Suspense>
        <CategoryTable
          rows={pagedRows}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          perPage={PER_PAGE}
        />
      </Suspense>
    </div>
  );
}
