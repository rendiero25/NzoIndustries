import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { ProductFilters } from "./_components/product-filters";
import { ProductTable, type ProductRow } from "./_components/product-table";

export const metadata: Metadata = { title: "Kelola Produk · Admin" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  condition?: string;
  brand?: string;
  category?: string;
  sort?: string;
  page?: string;
}>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const conditionFilter = params.condition ?? "";
  const brandId = params.brand ?? "";
  const categoryId = params.category ?? "";
  const sort = params.sort ?? "latest";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  const [{ data: categories }, { data: brands }, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_active", true).order("name"),

    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),

    (() => {
      let query = supabase
        .from("products")
        .select(
          `id, name, slug, base_price, sale_price, condition, is_active, is_featured, created_at,
           categories(id, name),
           product_images(url, is_primary),
           product_variants(id, stock, reserved, is_active)`,
          { count: "exact" },
        )
        .is("deleted_at", null);

      if (q) query = query.ilike("name", `%${q}%`);
      if (status === "active") query = query.eq("is_active", true);
      if (status === "inactive") query = query.eq("is_active", false);
      if (conditionFilter === "new" || conditionFilter === "second")
        query = query.eq("condition", conditionFilter);
      if (brandId) query = query.eq("brand_id", brandId);
      if (categoryId) query = query.eq("category_id", categoryId);

      switch (sort) {
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "name-asc":
          query = query.order("name", { ascending: true });
          break;
        case "name-desc":
          query = query.order("name", { ascending: false });
          break;
        case "price-asc":
          query = query.order("base_price", { ascending: true });
          break;
        case "price-desc":
          query = query.order("base_price", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      return query.range(from, to);
    })(),
  ]);

  const { data: products, count } = productsResult;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Katalog</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Produk</h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            {count ?? 0} produk{q ? ` untuk "${q}"` : ""}
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/products/new">
            <Plus size={14} strokeWidth={2} />
            Tambah Produk
          </Link>
        </Button>
      </div>

      <Suspense>
        <ProductFilters
          categories={categories ?? []}
          brands={(brands ?? []) as { id: string; name: string }[]}
        />
      </Suspense>

      <Suspense>
        <ProductTable
          products={(products ?? []) as ProductRow[]}
          page={page}
          totalPages={totalPages}
          totalCount={count ?? 0}
          perPage={PER_PAGE}
          brands={(brands ?? []) as { id: string; name: string }[]}
        />
      </Suspense>
    </div>
  );
}
