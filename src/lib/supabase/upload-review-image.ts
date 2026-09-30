import { createServiceClient } from "@/lib/supabase/server";
import {
  REVIEW_IMAGE_MAX_SIZE_MB,
  REVIEW_IMAGE_MIME_TYPES,
  REVIEW_IMAGES_BUCKET,
} from "@/lib/constants/review-images";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Upload foto ulasan ke folder milik user. Pakai service role supaya bucket
 * tidak butuh policy INSERT; path selalu dibangun dari userId hasil auth.
 */
export async function uploadReviewImage(
  file: File,
  userId: string,
): Promise<{ url: string } | { error: string }> {
  if (file.size > REVIEW_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    return { error: `Foto terlalu besar (maks ${REVIEW_IMAGE_MAX_SIZE_MB} MB).` };
  }
  if (!REVIEW_IMAGE_MIME_TYPES.includes(file.type)) {
    return { error: "Format tidak didukung. Gunakan JPG, PNG, atau WEBP." };
  }

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${EXT_BY_MIME[file.type]}`;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.storage.from(REVIEW_IMAGES_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return { error: error.message };

    const { data } = supabase.storage.from(REVIEW_IMAGES_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch {
    return { error: "Upload foto gagal. Coba lagi." };
  }
}
