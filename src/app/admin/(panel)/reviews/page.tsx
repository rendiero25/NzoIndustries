import type { Metadata } from "next";
import Link from "next/link";

import { ReviewModeration } from "@/components/admin/service/review-moderation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { listAdminReviews, REVIEWS_PER_PAGE } from "@/server/queries/admin/service";

export const metadata: Metadata = { title: "Ulasan" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "pending", label: "Menunggu" },
  { key: "published", label: "Tayang" },
  { key: "hidden", label: "Disembunyikan" },
  { key: "all", label: "Semua" },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; rating?: string; page?: string }>;
}) {
  await requireRole(["owner", "admin", "cs"]);
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? sp.status! : "pending";
  const rating = Number(sp.rating) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listAdminReviews({
    status: status === "all" ? undefined : status,
    rating,
    page,
  });
  const pages = Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({
      status,
      rating: rating ? String(rating) : undefined,
      ...patch,
    }))
      if (v) u.set(k, v);
    return `/admin/reviews?${u}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ulasan"
        description="Ulasan baru menunggu moderasi sebelum tampil di halaman produk. Rating produk dihitung dari ulasan yang tayang."
      />
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button key={t.key} asChild size="sm" variant={status === t.key ? "primary" : "outline"}>
            <Link href={qs({ status: t.key, page: undefined })}>{t.label}</Link>
          </Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        {[5, 4, 3, 2, 1].map((r) => (
          <Link
            key={r}
            href={qs({ rating: rating === r ? undefined : String(r), page: undefined })}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-sm hover:bg-muted",
              rating === r && "border-foreground bg-muted font-medium",
            )}
          >
            {r}★
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{total.toLocaleString("id-ID")} ulasan</p>
      <ReviewModeration reviews={rows} />
      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {page} dari {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={qs({ page: String(page - 1) })}>Sebelumnya</Link>
              </Button>
            ) : null}
            {page < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={qs({ page: String(page + 1) })}>Berikutnya</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
