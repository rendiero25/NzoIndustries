import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "../../_components/category-form";

export const metadata: Metadata = { title: "Edit Kategori — Admin NZO Industries" };

type Props = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: category }, { data: parentCategories }] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).single(),
    supabase
      .from("categories")
      .select("id, name")
      .is("parent_id", null)
      .eq("is_active", true)
      .neq("id", id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <nav className="flex items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/categories" className="admin-text-link font-medium">
          Kategori
        </Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-foreground">Edit: {category.name}</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Katalog</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Edit Kategori</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">Perbarui data kategori.</p>
      </div>

      <CategoryForm
        parentCategories={parentCategories ?? []}
        categoryId={id}
        defaultValues={{
          name: category.name,
          slug: category.slug,
          parent_id: category.parent_id ?? "",
          sort_order: category.sort_order,
          is_active: category.is_active,
        }}
      />
    </div>
  );
}
