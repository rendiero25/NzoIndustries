"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price?: number | null;
  average_rating: number;
  review_count: number;
  is_featured: boolean;
  primary_image?: string | null;
  primary_image_alt?: string | null;
  is_flash_sale?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  onWishlist?: (id: string) => void;
  isWishlisted?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  onWishlist,
  isWishlisted = false,
  className,
}: ProductCardProps) {
  const hasDiscount = product.sale_price != null && product.sale_price < product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
    : 0;

  return (
    <div
      className={cn(
        "group transition-swiss relative flex flex-col border border-foreground bg-background",
        className,
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {product.primary_image ? (
          <Image
            src={product.primary_image}
            alt={product.primary_image_alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-muted-foreground uppercase">No Image</span>
          </div>
        )}

        <div className="absolute top-0 left-0 flex flex-col gap-1 p-2">
          {product.is_flash_sale && (
            <span className="text-swiss-label bg-brand px-1.5 py-0.5 text-white">FLASH</span>
          )}
          {hasDiscount && (
            <span className="text-swiss-label bg-foreground px-1.5 py-0.5 text-background">
              -{discountPercent}%
            </span>
          )}
          {product.is_featured && !hasDiscount && !product.is_flash_sale && (
            <span className="text-swiss-label bg-foreground px-1.5 py-0.5 text-background">
              FEATURED
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {product.review_count > 0 && (
          <div className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-brand"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-xs font-semibold">{product.average_rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({product.review_count})</span>
          </div>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm leading-tight font-bold transition-colors hover:text-brand"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-swiss-price">
              {formatRupiah(product.sale_price ?? product.base_price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatRupiah(product.base_price)}
              </span>
            )}
          </div>

          {onWishlist && (
            <Button
              variant="icon-chip"
              size="icon-sm"
              className="shrink-0"
              onClick={(e) => {
                e.preventDefault();
                onWishlist(product.id);
              }}
              aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
            >
              <Heart className={cn("h-4 w-4", isWishlisted && "fill-brand text-brand")} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
