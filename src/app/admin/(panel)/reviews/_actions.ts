"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncProductRating } from "@/lib/products/sync-product-rating";
import { createServiceClient } from "@/lib/supabase/server";

export async function deleteReview(reviewId: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { data: review, error: reviewError } = await supabase
    .from("product_reviews")
    .select("product_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError || !review) return { error: reviewError?.message ?? "Ulasan tidak ditemukan." };

  const { error } = await supabase
    .from("product_reviews")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", reviewId);

  if (error) return { error: error.message };
  const ratingSync = await syncProductRating(review.product_id);
  if (!ratingSync.success) return { error: ratingSync.error };

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", review.product_id)
    .maybeSingle();
  if (product?.slug) revalidatePath(`/products/${product.slug}`);
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/reviews");
  return {};
}

const updateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).nullable(),
});

export async function updateReview(
  input: z.infer<typeof updateReviewSchema>,
): Promise<{ error?: string }> {
  const parsed = updateReviewSchema.safeParse(input);
  if (!parsed.success) return { error: "Data tidak valid." };

  const supabase = await createServiceClient();
  const { data: review, error: reviewError } = await supabase
    .from("product_reviews")
    .select("product_id")
    .eq("id", parsed.data.reviewId)
    .maybeSingle();
  if (reviewError || !review) return { error: reviewError?.message ?? "Ulasan tidak ditemukan." };

  const { error } = await supabase
    .from("product_reviews")
    .update({ rating: parsed.data.rating, comment: parsed.data.comment })
    .eq("id", parsed.data.reviewId);

  if (error) return { error: error.message };
  const ratingSync = await syncProductRating(review.product_id);
  if (!ratingSync.success) return { error: ratingSync.error };

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", review.product_id)
    .maybeSingle();
  if (product?.slug) revalidatePath(`/products/${product.slug}`);
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/reviews");
  return {};
}
