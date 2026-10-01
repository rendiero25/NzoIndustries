import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/legacy/server";
import { uploadReviewImage } from "@/lib/supabase/legacy/upload-review-image";

const fileSchema = z.instanceof(File, { message: "File foto wajib diisi." });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const parsed = fileSchema.safeParse(formData.get("file"));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 },
      );
    }

    const result = await uploadReviewImage(parsed.data, user.id);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { url: result.url } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Upload foto gagal. Coba lagi." },
      { status: 500 },
    );
  }
}
