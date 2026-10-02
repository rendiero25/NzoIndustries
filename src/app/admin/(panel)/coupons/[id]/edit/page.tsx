import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { CouponForm } from "../../_components/coupon-form";

export const metadata: Metadata = { title: "Edit Kupon — Admin NZO Industries" };
export const dynamic = "force-dynamic";

export default async function AdminEditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [couponRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
    supabase
      .from("coupons")
      .select(
        "id, code, title, description, type, value, min_purchase, max_discount, max_usage, is_active, valid_from, valid_until, image_url, applies_to, applies_to_ids",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("products")
      .select("id, name, category_id, brand_id")
      .eq("is_active", true)
      .order("name"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
    supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
  ]);

  const coupon = couponRes.data;
  if (!coupon) notFound();

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
        <span className="font-semibold text-foreground">Edit {coupon.code}</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Pemasaran</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Edit Kupon</h1>
        <p className="mt-1 font-mono text-base leading-[1.47] text-foreground">{coupon.code}</p>
      </div>

      <CouponForm
        initialData={{
          id: coupon.id,
          code: coupon.code,
          title: coupon.title ?? null,
          description: coupon.description ?? null,
          type: coupon.type as "percentage" | "fixed",
          value: coupon.value,
          min_purchase: coupon.min_purchase ?? 0,
          max_discount: coupon.max_discount ?? null,
          max_usage: coupon.max_usage ?? null,
          is_active: coupon.is_active,
          valid_from: coupon.valid_from ?? null,
          valid_until: coupon.valid_until ?? null,
          image_url: coupon.image_url ?? null,
          applies_to: (coupon.applies_to ?? "all") as "all" | "product" | "category" | "brand",
          applies_to_ids: (coupon.applies_to_ids ?? []) as string[],
        }}
        products={productsRes.data ?? []}
        categories={categoriesRes.data ?? []}
        brands={brandsRes.data ?? []}
      />
    </div>
  );
}
