import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { fetchUserAddresses } from "@/lib/data/dashboard-user";

export async function GET() {
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

    const addresses = await fetchUserAddresses(user.id);
    return NextResponse.json({ success: true, data: addresses });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal memuat alamat." }, { status: 500 });
  }
}
