"use server";

import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  AFTER_SALES_MAX_BYTES,
  AFTER_SALES_TYPES,
  IMAGE_TYPES,
  REVIEW_IMAGE_MAX_BYTES,
  uploadRequestSchema,
} from "@/lib/validations/account";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

export type UploadTicket =
  { ok: true; bucket: string; path: string; token: string } | { ok: false; error: string };

/**
 * Tiket upload: path `{uid}/{uuid}.{ext}` ditentukan server; tipe & ukuran
 * dicek di sini dan dibatasi lagi oleh konfigurasi bucket + RLS storage.
 */
export async function requestUpload(input: {
  bucket: "review-images" | "after-sales-media";
  contentType: string;
  size: number;
}): Promise<UploadTicket> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "File tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("upload", user.id))) {
    return { ok: false, error: "Terlalu banyak unggahan. Coba lagi beberapa menit lagi." };
  }

  const { bucket, contentType, size } = parsed.data;
  const review = bucket === "review-images";
  const allowed: readonly string[] = review ? IMAGE_TYPES : AFTER_SALES_TYPES;
  if (!allowed.includes(contentType)) {
    return {
      ok: false,
      error: review ? "Foto harus JPG, PNG, atau WebP." : "File harus foto atau video MP4.",
    };
  }
  const max = review ? REVIEW_IMAGE_MAX_BYTES : AFTER_SALES_MAX_BYTES;
  if (size > max) {
    return { ok: false, error: `Ukuran maksimal ${Math.round(max / 1024 / 1024)} MB.` };
  }

  const path = `${user.id}/${crypto.randomUUID()}.${EXT[contentType]}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Unggahan gagal disiapkan." };
  return { ok: true, bucket, path, token: data.token };
}
