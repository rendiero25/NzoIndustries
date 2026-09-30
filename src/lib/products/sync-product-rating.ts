import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type ProductRatingSyncResult =
  { success: true; averageRating: number; reviewCount: number } | { success: false; error: string };

/**
 * Repair summary fields used by public product pages.
 *
 * The database trigger is source of truth. This server-side sync is a safety
 * net for environments where an older database is missing that trigger.
 */
export async function syncProductRating(productId: string): Promise<ProductRatingSyncResult> {
  const supabase = createServiceClient();
  const { data: reviews, error: reviewsError } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .is("deleted_at", null);

  if (reviewsError) return { success: false, error: reviewsError.message };

  const reviewCount = reviews?.length ?? 0;
  const averageRating = reviewCount
    ? Math.round(
        (reviews.reduce((total, review) => total + Number(review.rating), 0) / reviewCount) * 100,
      ) / 100
    : 0;

  const { error: updateError } = await supabase
    .from("products")
    .update({ average_rating: averageRating, review_count: reviewCount })
    .eq("id", productId);

  if (updateError) return { success: false, error: updateError.message };
  return { success: true, averageRating, reviewCount };
}
