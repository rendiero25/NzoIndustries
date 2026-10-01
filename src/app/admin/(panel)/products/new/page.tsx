import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { ProductForm } from "../_components/product-form";

export const metadata: Metadata = { title: "Tambah Produk — Admin NZO Industries" };

export default async function NewProductPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/products" className="admin-text-link font-medium">
          Produk
        </Link>
        <ChevronRight size={12} className="shrink-0 opacity-60" />
        <span className="font-semibold text-foreground">Tambah Produk</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Katalog</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Tambah Produk</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Isi data produk lengkap termasuk gambar, varian, dan SEO.
        </p>
      </div>

      <ProductForm categories={categories ?? []} brands={brands ?? []} />
    </div>
  );
}
