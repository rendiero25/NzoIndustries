import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import {
  fetchOrderDetailForUser,
  fetchReviewedProductIdsForOrder,
} from "@/lib/data/dashboard-user";
import { OrderReviewForms } from "@/components/dashboard/order-review-forms";

export default async function OrderReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/review`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const reviewedIds = await fetchReviewedProductIdsForOrder(user.id, id);
  const canReview = detail.order.status === "delivered" || detail.order.status === "completed";

  return (
    <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold text-foreground">Beri ulasan</h2>
      {!canReview ? (
        <p className="mt-3 text-sm text-steel-700">
          Ulasan dapat dikirim setelah pesanan berstatus tiba di tujuan atau selesai.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-steel-700">
            Ulasan akan ditinjau tim kami sebelum tampil di halaman produk.
          </p>
          <div className="mt-6">
            <OrderReviewForms
              orderId={detail.order.id}
              items={detail.items}
              reviewedProductIds={reviewedIds}
            />
          </div>
        </>
      )}
    </div>
  );
}
