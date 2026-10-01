import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { ProductForm } from "../../_components/product-form";
import type { ImageItem } from "../../_components/image-uploader";

export const metadata: Metadata = { title: "Edit Produk — Admin NZO Industries" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, name, slug, description, base_price, sale_price, min_order_qty,
         category_id, brand_id, condition, is_active, is_featured, meta_title, meta_description, deleted_at,
         product_images(id, url, is_primary, alt_text, sort_order),
         product_variants(id, name, sku, price, stock, weight, length, width, height, is_active, image_url, image_id),
         product_tags(tag)`,
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single(),

    supabase.from("categories").select("id, name").eq("is_active", true).order("name"),

    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  if (!product) notFound();

  const defaultImages: ImageItem[] = [...(product.product_images ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      url: img.url,
      is_primary: img.is_primary,
      alt_text: img.alt_text ?? "",
    }));

  // Fallback data lama: varian yang masih menunjuk ke row product_images
  // (kolom image_id, deprecated) — dipakai sampai admin mengedit produknya.
  const legacyImageUrlById = new Map<string, string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (product.product_images ?? []).map((img: any) => [img.id, img.url]),
  );

  const defaultVariants = [...(product.product_variants ?? [])]
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length ?? 0,
      width: v.width ?? 0,
      height: v.height ?? 0,
      is_active: v.is_active,
      image_url: v.image_url ?? legacyImageUrlById.get(v.image_id) ?? "",
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultTags = (product.product_tags ?? []).map((t: any) => t.tag);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/products" className="admin-text-link font-medium">
          Produk
        </Link>
        <ChevronRight size={12} className="shrink-0 opacity-60" />
        <span className="max-w-xs truncate font-semibold text-foreground">{product.name}</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Katalog</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Edit Produk</h1>
        <p className="mt-1 font-mono text-[17px] leading-[1.47] text-foreground">/{product.slug}</p>
      </div>

      <ProductForm
        categories={categories ?? []}
        brands={brands ?? []}
        defaultProduct={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          base_price: product.base_price,
          sale_price: product.sale_price,
          min_order_qty: product.min_order_qty,
          category_id: product.category_id,
          brand_id: product.brand_id ?? null,
          condition: product.condition ?? "new",
          is_active: product.is_active,
          is_featured: product.is_featured,
          meta_title: product.meta_title,
          meta_description: product.meta_description,
        }}
        defaultImages={defaultImages}
        defaultVariants={defaultVariants}
        defaultTags={defaultTags}
      />
    </div>
  );
}
