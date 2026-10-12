import { ArrowLeft, ExternalLink, Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ProductCoreForm } from "@/components/admin/products/product-core-form";
import {
  FitmentsEditor,
  SpecsEditor,
  VariantsEditor,
} from "@/components/admin/products/product-detail-editors";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth/guards";
import { getAdminProduct, getProductFormOptions } from "@/server/queries/admin/products";
import { getVehicleCatalog } from "@/server/queries/reference";

export const metadata: Metadata = { title: "Ubah produk" };
export const dynamic = "force-dynamic";

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["owner", "admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [product, options, vehicles] = await Promise.all([
    getAdminProduct(id),
    getProductFormOptions(),
    getVehicleCatalog(),
  ]);
  if (!product) notFound();

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/products"
          className="flex items-center gap-1 text-sm text-steel-700 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Semua produk
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{product.sku}</span>
              {product.sourceSku && product.sourceSku !== product.sku
                ? ` · SKU Jubelio ${product.sourceSku}`
                : ""}{" "}
              · {product.totalSold} terjual
              {product.importLocked ? " · dikunci dari import ulang" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/products/${product.id}/images`}>
                <Images className="size-4" /> Foto ({product.imageCount})
              </Link>
            </Button>
            {product.status === "published" ? (
              <Button asChild variant="ghost">
                <a href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> Lihat di toko
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Tabs defaultValue="core">
        <TabsList className="flex-wrap">
          <TabsTrigger value="core">Data utama</TabsTrigger>
          <TabsTrigger value="variants">Varian ({product.variants.length})</TabsTrigger>
          <TabsTrigger value="specs">Spesifikasi ({product.specs.length})</TabsTrigger>
          <TabsTrigger value="fitment">Kecocokan ({product.fitments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="core" className="mt-4">
          <ProductCoreForm
            productId={product.id}
            stock={product.stock}
            brands={options.brands}
            categories={options.categories}
            defaults={{
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              status: product.status,
              brandId: product.brandId,
              categoryIds: product.categoryIds,
              price: product.price,
              compareAtPrice: product.compareAtPrice ?? "",
              shortDescription: product.shortDescription ?? "",
              description: product.description ?? "",
              installationGuide: product.installationGuide ?? "",
              warrantyInfo: product.warrantyInfo ?? "",
              weightGrams: product.weightGrams ?? "",
              lengthMm: product.lengthMm ?? "",
              widthMm: product.widthMm ?? "",
              heightMm: product.heightMm ?? "",
              metaTitle: product.metaTitle ?? "",
              metaDescription: product.metaDescription ?? "",
            }}
          />
        </TabsContent>
        <TabsContent value="variants" className="mt-4">
          <VariantsEditor product={product} />
        </TabsContent>
        <TabsContent value="specs" className="mt-4">
          <SpecsEditor product={product} />
        </TabsContent>
        <TabsContent value="fitment" className="mt-4">
          <FitmentsEditor product={product} makes={vehicles.makes} models={vehicles.models} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
