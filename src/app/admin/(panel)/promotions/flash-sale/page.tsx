import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { FlashSaleTable, type FlashSaleRow } from "./_components/flash-sale-table";

export const metadata: Metadata = { title: "Flash Sale — Admin NZO Industries" };
export const dynamic = "force-dynamic";

export default async function AdminFlashSalePage() {
  const supabase = await createClient();

  const { data: flashSales } = await supabase
    .from("flash_sales")
    .select("id, name, starts_at, ends_at, is_active, created_at")
    .order("starts_at", { ascending: false });

  const ids = flashSales?.map((s) => s.id) ?? [];
  const productCountMap: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: fsp } = await supabase
      .from("flash_sale_products")
      .select("flash_sale_id")
      .in("flash_sale_id", ids);

    for (const row of fsp ?? []) {
      productCountMap[row.flash_sale_id] = (productCountMap[row.flash_sale_id] ?? 0) + 1;
    }
  }

  const rows: FlashSaleRow[] = (flashSales ?? []).map((s) => ({
    ...s,
    product_count: productCountMap[s.id] ?? 0,
  }));

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Promosi</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Flash Sale</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            {flashSales?.length ?? 0} flash sale
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/promotions/flash-sale/new">
            <Plus size={14} strokeWidth={2} />
            Buat Flash Sale
          </Link>
        </Button>
      </div>

      <FlashSaleTable flashSales={rows} />
    </div>
  );
}
