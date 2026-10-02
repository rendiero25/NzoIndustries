import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { CategoryForm } from "../_components/category-form";

export const metadata: Metadata = { title: "Tambah Kategori — Admin NZO Industries" };

export default async function NewCategoryPage() {
  const supabase = await createClient();

  const { data: parentCategories } = await supabase
    .from("categories")
    .select("id, name")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <nav className="flex items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/categories" className="admin-text-link font-medium">
          Kategori
        </Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-foreground">Tambah Kategori</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Katalog</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Tambah Kategori</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Buat kategori baru. Kategori induk bisa memiliki subkategori.
        </p>
      </div>

      <CategoryForm parentCategories={parentCategories ?? []} />
    </div>
  );
}
