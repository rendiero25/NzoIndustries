import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CouponForm } from "../_components/coupon-form";

export const metadata: Metadata = { title: "Buat Kupon — Admin NZO Industries" };

export default async function AdminNewCouponPage() {
  const supabase = await createClient();

  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category_id, brand_id")
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-foreground">
        <Link href="/admin/coupons" className="admin-text-link font-medium">
          <span className="inline-flex items-center gap-1">
            <ChevronLeft size={14} />
            Kupon
          </span>
        </Link>
        <span className="text-foreground/60">/</span>
        <span className="font-semibold text-foreground">Buat Kupon</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Pemasaran</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Buat Kupon</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Tambahkan kode diskon untuk pelanggan.
        </p>
      </div>

      <CouponForm
        products={productsRes.data ?? []}
        categories={categoriesRes.data ?? []}
        brands={brandsRes.data ?? []}
      />
    </div>
  );
}
