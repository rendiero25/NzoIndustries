import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import { FlashSaleForm } from "../_components/flash-sale-form-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Buat Flash Sale — Admin NZO Industries" };

export default async function AdminFlashSaleNewPage() {
  const supabase = createServiceClient();

  const { data: rawProducts } = await supabase
    .from("products")
    .select(
      "id, name, condition, brands:brand_id(id, name), categories:category_id(id, name), product_variants(id, name, price)",
    )
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name");

  const categoryMap = new Map<string, string>();
  const brandMap = new Map<string, string>();

  const products = (rawProducts ?? []).map((p) => {
    const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
    const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
    const typedBrand = brand as { id: string; name: string } | null | undefined;
    const typedCat = category as { id: string; name: string } | null | undefined;

    if (typedBrand) brandMap.set(typedBrand.id, typedBrand.name);
    if (typedCat) categoryMap.set(typedCat.id, typedCat.name);

    return {
      id: p.id,
      name: p.name,
      condition: p.condition as string | null,
      brand_id: typedBrand?.id ?? null,
      brand_name: typedBrand?.name ?? null,
      category_id: typedCat?.id ?? null,
      category_name: typedCat?.name ?? null,
      variants: ((p.product_variants ?? []) as { id: string; name: string; price: number }[]).map(
        (v) => ({ id: v.id, name: v.name, price: v.price }),
      ),
    };
  });

  const categories = Array.from(categoryMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const brands = Array.from(brandMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <Link
        href="/admin/promotions/flash-sale"
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar flash sale
      </Link>

      <div>
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Buat Flash Sale</h1>
      </div>

      <div className="admin-utility-card p-6">
        <FlashSaleForm products={products} categories={categories} brands={brands} />
      </div>
    </div>
  );
}
