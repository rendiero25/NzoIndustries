import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { CatalogProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductGrid } from "@/components/storefront/product-grid";
import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/wishlist");

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
    <div className="nzo-container py-8 md:py-12">
      <header className="mb-8 flex flex-col gap-1.5">
        <h1 className="text-[1.75rem] leading-9 md:text-[2.25rem] md:leading-[2.75rem]">
          Wishlist
        </h1>
        <p className="text-muted-foreground">{items.length} produk tersimpan</p>
      </header>
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
