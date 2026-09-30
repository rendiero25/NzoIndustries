import { createClient } from "@/lib/supabase/server";

const BUCKET = "complaint-images";
const MAX_SIZE_MB = 50;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

export async function uploadComplaintMedia(
  file: File,
  orderId: string,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { error: `File terlalu besar (maks ${MAX_SIZE_MB} MB).` };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format tidak didukung. Gunakan JPG, PNG, atau MP4/MOV." };
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
