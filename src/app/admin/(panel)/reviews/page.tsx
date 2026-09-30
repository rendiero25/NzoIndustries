import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ReviewFilters } from "./_components/review-filters";
import { ReviewTable, type ReviewRow } from "./_components/review-table";

export const metadata: Metadata = { title: "Ulasan — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  rating?: string;
  page?: string;
}>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const rating = params.rating ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("product_reviews")
    .select(
      `id, rating, comment, images, deleted_at, created_at, product_id,
       products:product_id (name, slug),
       profiles:user_id (full_name)`,
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (rating) query = query.eq("rating", parseInt(rating, 10));

  const { data: reviews, count } = await query;

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Konten</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Ulasan</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            {count ?? 0} ulasan
            {q ? ` untuk "${q}"` : ""}
            {rating ? ` · bintang ${rating}` : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Suspense>
        <ReviewFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <ReviewTable reviews={(reviews ?? []) as ReviewRow[]} page={page} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}
