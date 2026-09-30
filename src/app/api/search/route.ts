import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, base_price, sale_price, product_images(url, is_primary)")
    .eq("is_active", true)
    .is("deleted_at", null)
    .ilike("name", `%${q}%`)
    .limit(6);

  const results = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_price: p.base_price,
    sale_price: p.sale_price,
    image:
      (p.product_images as { url: string; is_primary: boolean }[])?.find((img) => img.is_primary)
        ?.url ??
      (p.product_images as { url: string }[])?.[0]?.url ??
      null,
  }));

  return NextResponse.json({ results });
}
