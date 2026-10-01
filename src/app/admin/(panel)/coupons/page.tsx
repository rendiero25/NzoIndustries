import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { CouponTable, type CouponRow } from "./_components/coupon-table";

export const metadata: Metadata = { title: "Kupon — Admin NZO Industries" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const supabase = await createClient();

  const { data: coupons } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, min_purchase, max_discount, max_usage, used_count, is_active, valid_from, valid_until, created_at",
    )
    .order("created_at", { ascending: false });

  const rows: CouponRow[] = (coupons ?? []) as CouponRow[];

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Pemasaran</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Kupon</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">{rows.length} kupon</p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/coupons/new">
            <Plus size={14} strokeWidth={2} />
            Buat Kupon
          </Link>
        </Button>
      </div>

      <CouponTable coupons={rows} />
    </div>
  );
}
