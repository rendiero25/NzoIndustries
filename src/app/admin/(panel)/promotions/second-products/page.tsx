import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/legacy/server";
import { PromotionTable, type PromotionTableRow } from "../_components/promotion-table";

export const metadata: Metadata = { title: "Produk Second · Admin" };
export const dynamic = "force-dynamic";

const BASE_PATH = "/admin/promotions/second-products";

export default async function SecondProductsPage() {
  const supabase = createServiceClient();

  const { data: promos } = await supabase
    .from("promotions")
    .select("id, type, title, subtitle, is_active, max_items, selection_mode, created_at")
    .eq("type", "second_products")
    .order("created_at", { ascending: false });

  const ids = (promos ?? []).map((p) => p.id);
  const productCountMap: Record<string, number> = {};
  const brandCountMap: Record<string, number> = {};

  if (ids.length > 0) {
    const [{ data: pp }, { data: pb }] = await Promise.all([
      supabase.from("promotion_products").select("promotion_id").in("promotion_id", ids),
      supabase.from("promotion_brands").select("promotion_id").in("promotion_id", ids),
    ]);
    for (const r of pp ?? [])
      if (r.promotion_id)
        productCountMap[r.promotion_id] = (productCountMap[r.promotion_id] ?? 0) + 1;
    for (const r of pb ?? [])
      if (r.promotion_id) brandCountMap[r.promotion_id] = (brandCountMap[r.promotion_id] ?? 0) + 1;
  }

  const rows: PromotionTableRow[] = (promos ?? []).map((p) => ({
    id: p.id,
    type: p.type as import("../_actions").PromotionType,
    title: p.title,
    subtitle: p.subtitle,
    is_active: p.is_active ?? false,
    max_items: p.max_items ?? 0,
    selection_mode: (p.selection_mode ?? "manual") as "manual" | "brand",
    created_at: p.created_at ?? new Date().toISOString(),
    product_count: productCountMap[p.id] ?? 0,
    brand_count: brandCountMap[p.id] ?? 0,
  }));

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Promosi</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">
            Produk Second Terbaik
          </h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            {rows.length} promosi · Tampilkan produk second pilihan di halaman publik
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href={`${BASE_PATH}/new`}>
            <Plus size={14} strokeWidth={2} />
            Buat Promosi
          </Link>
        </Button>
      </div>
      <PromotionTable
        rows={rows}
        basePath={BASE_PATH}
        emptyLabel="Belum ada promosi produk second"
      />
    </div>
  );
}
