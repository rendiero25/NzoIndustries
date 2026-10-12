import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  salesToday: number;
  sales7d: number;
  sales30d: number;
  orders30d: number;
  byStatus: Record<string, number>;
  series: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string | null; name: string; qty: number; revenue: number }[];
  lowStockCount: number;
  outOfStockCount: number;
  lowStock: { id: string; name: string; sku: string; stock: number }[];
  threshold: number;
};

type Raw = {
  sales_today: number;
  sales_7d: number;
  sales_30d: number;
  orders_30d: number;
  by_status: Record<string, number>;
  series: { date: string; revenue: number; orders: number }[];
  top_products: { product_id: string | null; name: string; qty: number; revenue: number }[];
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock: { id: string; name: string; sku: string; stock: number }[];
  threshold: number;
};

/** KPI beranda admin (RPC `admin_dashboard_stats`, cek staf di DB). */
export async function getDashboardStats(days = 30): Promise<DashboardStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats", { p_days: days });
  if (error || !data) return null;
  const r = data as unknown as Raw;
  return {
    salesToday: Number(r.sales_today),
    sales7d: Number(r.sales_7d),
    sales30d: Number(r.sales_30d),
    orders30d: Number(r.orders_30d),
    byStatus: r.by_status ?? {},
    series: (r.series ?? []).map((s) => ({
      date: s.date,
      revenue: Number(s.revenue),
      orders: Number(s.orders),
    })),
    topProducts: (r.top_products ?? []).map((t) => ({
      productId: t.product_id,
      name: t.name,
      qty: Number(t.qty),
      revenue: Number(t.revenue),
    })),
    lowStockCount: Number(r.low_stock_count),
    outOfStockCount: Number(r.out_of_stock_count ?? 0),
    lowStock: r.low_stock ?? [],
    threshold: Number(r.threshold),
  };
}
