import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json({ success: false, error: "File tidak ditemukan." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { success: false, error: "Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF." },
        { status: 400 },
      );
    if (file.size > MAX_SIZE)
      return NextResponse.json(
        { success: false, error: "Ukuran file maksimal 2MB." },
        { status: 400 },
      );

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${Date.now()}.${ext}`;

    const service = createServiceClient();
    const { error: uploadError } = await service.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError)
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });

    const {
      data: { publicUrl },
    } = service.storage.from("avatars").getPublicUrl(path);

    const { error: profileErr } = await service
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileErr) {
      return NextResponse.json(
        { success: false, error: `Upload ok, gagal simpan URL profil: ${profileErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch {
    return NextResponse.json({ success: false, error: "Terjadi kesalahan." }, { status: 500 });
  }
}
