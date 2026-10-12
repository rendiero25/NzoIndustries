import { Heart } from "lucide-react";
import type { Metadata } from "next";

import type { CatalogProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/storefront/product-grid";
import { createClient } from "@/lib/supabase/server";
import { requireAccountUser } from "@/server/queries/account";

export const metadata: Metadata = { title: "Wishlist" };

export default async function AccountWishlistPage() {
  const user = await requireAccountUser();

  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select(
      "created_at, product:products(id, slug, name, price, compare_at_price, stock, status, average_rating, review_count, total_sold, brand:brands(name), images:product_images(public_id, sort_order), variants:product_variants(id, is_active))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const items: CatalogProductCard[] = (data ?? []).flatMap((w) => {
    const p = w.product;
    if (!p || p.status !== "published") return [];
    const image = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return [
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brandName: p.brand?.name ?? null,
        price: Number(p.price),
        compareAtPrice: p.compare_at_price === null ? null : Number(p.compare_at_price),
        stock: p.stock,
        averageRating: Number(p.average_rating),
        reviewCount: p.review_count,
        totalSold: p.total_sold,
        imagePublicId: image?.public_id ?? null,
        hasVariants: (p.variants ?? []).some((v) => v.is_active),
      },
    ];
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Wishlist"
        description={`${items.length} produk tersimpan`}
        className="pb-0"
      />
      {items.length ? (
        <ProductGrid items={items} wishlistIds={new Set(items.map((i) => i.id!))} />
      ) : (
        <EmptyState
          icon={Heart}
          title="Wishlist masih kosong"
          description="Simpan part yang kamu incar dengan ikon hati, supaya mudah dibeli nanti."
          action={{ label: "Cari part", href: "/products" }}
        />
      )}
    </div>
  );
}
