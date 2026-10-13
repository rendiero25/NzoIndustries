import type { Metadata } from "next";

import { CategoryTree } from "@/components/admin/catalog/category-tree";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { listAdminCategories } from "@/server/queries/admin/catalog";

export const metadata: Metadata = { title: "Kategori" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole(["owner", "admin"]);
  const categories = await listAdminCategories();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kategori"
        description={`${categories.length} kategori. Produk bisa masuk lebih dari satu kategori; jumlah produk dihitung per kategori langsung.`}
      />
      <CategoryTree categories={categories} />
    </div>
  );
}
