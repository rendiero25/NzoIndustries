import { Star } from "lucide-react";
import Link from "next/link";

import { dateShort } from "@/components/account/order-card";
import { ReviewDialog } from "@/components/account/review-dialog";
import { StatusBadge } from "@/components/account/status-badge";
import { ProductImage } from "@/components/catalog/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { REVIEW_STATUS_META } from "@/lib/orders/status";
import { listMyReviews } from "@/server/queries/account";

export const metadata = { title: "Ulasan" };

export default async function AccountReviewsPage() {
  const { pending, reviews } = await listMyReviews();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ulasan"
        description="Ulasanmu membantu pembeli lain memilih part yang tepat."
        className="pb-0"
      />

      <section aria-labelledby="to-review" className="flex flex-col gap-3">
        <h2 id="to-review" className="text-base">
          Menunggu ulasan ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada produk yang menunggu ulasan.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((p) => (
              <li
                key={p.orderItemId}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-steel-50">
                  <ProductImage publicId={p.imagePublicId} alt={p.name} sizes="56px" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col text-sm">
                  <span className="line-clamp-1 font-medium">{p.name}</span>
                  <Link
                    href={`/account/orders/${p.orderNumber}`}
                    className="font-mono text-caption text-muted-foreground hover:underline"
                  >
                    {p.orderNumber}
                  </Link>
                </div>
                <ReviewDialog orderItemId={p.orderItemId} productName={p.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-reviews" className="flex flex-col gap-3">
        <h2 id="my-reviews" className="text-base">
          Ulasan saya
        </h2>
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Belum ada ulasan"
            description="Ulasan yang kamu tulis akan muncul di sini."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => {
              const m = REVIEW_STATUS_META[r.status] ?? {
                label: r.status,
                tone: "neutral" as const,
              };
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {r.productSlug ? (
                      <Link
                        href={`/products/${r.productSlug}`}
                        className="font-medium hover:underline"
                      >
                        {r.productName}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.productName}</span>
                    )}
                    <StatusBadge label={m.label} tone={m.tone} />
                  </div>
                  <p className="flex items-center gap-1" aria-label={`${r.rating} dari 5 bintang`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < r.rating ? "fill-rating text-rating" : "text-steel-200"}`}
                        aria-hidden
                      />
                    ))}
                    <span className="ml-2 text-caption text-muted-foreground">
                      {dateShort.format(new Date(r.createdAt))}
                    </span>
                  </p>
                  {r.comment ? <p>{r.comment}</p> : null}
                  {r.reply ? (
                    <p className="rounded-md bg-steel-50 p-3 text-muted-foreground">
                      <span className="font-semibold text-foreground">Balasan NZO:</span> {r.reply}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
