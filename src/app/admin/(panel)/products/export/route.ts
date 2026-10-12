import * as XLSX from "xlsx";

import { checkRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /admin/products/export?q&status&brand&category — XLSX daftar produk
 * (owner/admin). Kolom mengikuti template import NZO supaya bisa diedit lalu
 * diimpor ulang di /admin/import.
 */
export async function GET(req: Request) {
  const { decision } = await checkRole(["owner", "admin"]);
  if (!decision.ok) return new Response("Forbidden", { status: 403 });

  const sp = new URL(req.url).searchParams;
  const supabase = await createClient();
  const rows: Record<string, string | number | null>[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    let query = supabase
      .from("products")
      .select(
        `sku, source_sku, name, status, price, compare_at_price, stock, weight_grams, length_mm, width_mm, height_mm, brand:brands(name), ${sp.get("category") ? "product_categories!inner(category_id)" : "product_categories(category_id)"}`,
      )
      .order("sku")
      .range(from, from + 999);
    const q = sp.get("q")?.trim();
    if (q) {
      const safe = q.replace(/[%,()]/g, " ").slice(0, 80);
      query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
    }
    const status = sp.get("status");
    if (status && ["draft", "published", "archived"].includes(status))
      query = query.eq("status", status as never);
    const brand = sp.get("brand");
    if (brand && /^[0-9a-f-]{36}$/.test(brand)) query = query.eq("brand_id", brand);
    const category = sp.get("category");
    if (category && /^[0-9a-f-]{36}$/.test(category))
      query = query.eq("product_categories.category_id", category);

    const { data, error } = await query;
    if (error) return new Response("Export gagal", { status: 500 });
    for (const p of data ?? []) {
      rows.push({
        SKU: p.sku,
        "SKU sumber": p.source_sku,
        Nama: p.name,
        Status: p.status,
        Harga: Number(p.price),
        "Harga coret": p.compare_at_price === null ? null : Number(p.compare_at_price),
        Stok: p.stock,
        "Berat (g)": p.weight_grams,
        "Panjang (mm)": p.length_mm,
        "Lebar (mm)": p.width_mm,
        "Tinggi (mm)": p.height_mm,
        Brand: p.brand?.name ?? null,
      });
    }
    if ((data ?? []).length < 1000) break;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Produk");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="produk-nzo-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
