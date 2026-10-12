import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Stok per item (produk tanpa varian / tiap varian) + reservasi aktif. */
export const STOCK_PER_PAGE = 30;

export type StockRow = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  sku: string;
  status: string;
  stock: number;
  reserved: number;
  available: number;
};

export type MovementRow = {
  id: number;
  createdAt: string;
  quantity: number;
  type: string;
  reason: string | null;
  referenceType: string | null;
  variantName: string | null;
  actor: string | null;
};

export async function listStock(
  f: { q?: string; filter?: string; page?: number },
  threshold: number,
) {
  const supabase = await createClient();
  const page = Math.max(1, Math.floor(f.page ?? 1));
  let query = supabase
    .from("products")
    .select("id, name, sku, status, stock, product_variants(id, name, sku, stock, is_active)", {
      count: "exact",
    })
    .neq("status", "archived")
    .order("stock", { ascending: true })
    .order("name")
    .range((page - 1) * STOCK_PER_PAGE, page * STOCK_PER_PAGE - 1);
  const q = f.q?.trim();
  if (q) {
    if (/^[0-9a-f-]{36}$/.test(q)) query = query.eq("id", q);
    else {
      const safe = q.replace(/[%,()]/g, " ").slice(0, 80);
      query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
    }
  }
  if (f.filter === "low") query = query.gt("stock", 0).lte("stock", threshold);
  if (f.filter === "out") query = query.lte("stock", 0);
  if (f.filter === "published") query = query.eq("status", "published");

  const { data, count } = await query;
  const productIds = (data ?? []).map((p) => p.id);
  const { data: res } = productIds.length
    ? await supabase
        .from("stock_reservations")
        .select("product_id, variant_id, quantity, expires_at")
        .eq("status", "active")
        .in("product_id", productIds)
    : {
        data: [] as {
          product_id: string;
          variant_id: string | null;
          quantity: number;
          expires_at: string;
        }[],
      };
  const now = Date.now();
  const reserved = (pid: string, vid: string | null) =>
    (res ?? [])
      .filter(
        (r) =>
          r.product_id === pid && r.variant_id === vid && new Date(r.expires_at).getTime() > now,
      )
      .reduce((n, r) => n + r.quantity, 0);

  const rows: StockRow[] = [];
  for (const p of data ?? []) {
    const variants = (p.product_variants ?? []).filter((v) => v.is_active);
    if (variants.length) {
      for (const v of variants) {
        const r = reserved(p.id, v.id);
        rows.push({
          productId: p.id,
          variantId: v.id,
          name: p.name,
          variantName: v.name,
          sku: v.sku,
          status: p.status,
          stock: v.stock,
          reserved: r,
          available: Math.max(0, v.stock - r),
        });
      }
    } else {
      const r = reserved(p.id, null);
      rows.push({
        productId: p.id,
        variantId: null,
        name: p.name,
        variantName: null,
        sku: p.sku,
        status: p.status,
        stock: p.stock,
        reserved: r,
        available: Math.max(0, p.stock - r),
      });
    }
  }
  return { page, total: count ?? 0, rows };
}

export async function listMovements(productId: string): Promise<MovementRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_movements")
    .select(
      "id, created_at, quantity, type, reason, reference_type, created_by, variant:product_variants(name)",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(100);
  const actorIds = [
    ...new Set((data ?? []).map((m) => m.created_by).filter((x): x is string => !!x)),
  ];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  return (data ?? []).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    quantity: m.quantity,
    type: m.type,
    reason: m.reason,
    referenceType: m.reference_type,
    variantName: m.variant?.name ?? null,
    actor:
      actors?.find((a) => a.id === m.created_by)?.full_name ?? (m.created_by ? "Staf" : "Sistem"),
  }));
}
