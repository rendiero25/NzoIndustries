export const REVIEW_IMAGES_BUCKET = "review-images";
export const REVIEW_IMAGES_MAX = 5;
export const REVIEW_IMAGE_MAX_SIZE_MB = 5;
export const REVIEW_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** URL publik foto ulasan milik user ini (folder `{userId}/` di bucket review-images). */
export function isOwnReviewImageUrl(url: string, userId: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return false;
  return url.startsWith(`${base}/storage/v1/object/public/${REVIEW_IMAGES_BUCKET}/${userId}/`);
}
