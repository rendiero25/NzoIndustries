import type { Metadata } from "next";

import { ProductCoreForm } from "@/components/admin/products/product-core-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getProductFormOptions } from "@/server/queries/admin/products";

export const metadata: Metadata = { title: "Tambah produk" };

export default async function AdminNewProductPage() {
  await requireRole(["owner", "admin"]);
  const options = await getProductFormOptions();
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader
        title="Tambah produk"
        description="Varian, spesifikasi, kecocokan, dan foto diisi setelah produk dibuat."
      />
      <ProductCoreForm
        brands={options.brands}
        categories={options.categories}
        defaults={{
          name: "",
          slug: "",
          sku: "",
          status: "draft",
          brandId: null,
          categoryIds: [],
          price: 0,
          compareAtPrice: "",
          weightGrams: "",
          lengthMm: "",
          widthMm: "",
          heightMm: "",
          initialStock: 0,
        }}
      />
    </div>
  );
}
