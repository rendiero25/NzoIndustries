import { ImageOff } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getCloudinaryConfig } from "@/lib/cloudinary/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Foto produk" };

/** Kelola foto produk (Cloudinary `nzo/products/{sku}`). Form produk lengkap di Fase 8. */
export default async function ProductImagesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["owner", "admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: images }] = await Promise.all([
    supabase.from("products").select("id, sku, name, status").eq("id", id).maybeSingle(),
    supabase
      .from("product_images")
      .select("id, public_id, alt_text")
      .eq("product_id", id)
      .order("sort_order"),
  ]);
  if (!product) notFound();

  const config = getCloudinaryConfig();

  return (
    <div className="space-y-6">
      <PageHeader title="Foto produk" description={`${product.name} · SKU ${product.sku}`} />
      {config ? (
        <ProductImageUploader
          productId={product.id}
          sku={product.sku}
          productName={product.name}
          initialImages={images ?? []}
          cloudName={config.cloudName}
          apiKey={config.apiKey}
        />
      ) : (
        <EmptyState
          icon={ImageOff}
          title="Cloudinary belum dikonfigurasi"
          description="Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di env."
        />
      )}
    </div>
  );
}
