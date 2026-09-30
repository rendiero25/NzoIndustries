"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { addVariantToCart } from "@/app/(public)/products/_actions/product-detail-actions";
import type { WishlistItemRow } from "@/lib/data/dashboard-user";
import { formatRupiah } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";

import { WishlistRemoveButton } from "@/components/dashboard/wishlist-remove-button";
import { Button } from "@/components/ui/button";

export function WishlistTileCard({ item }: { item: WishlistItemRow }) {
  const router = useRouter();
  const incrementCart = useCartStore((s) => s.incrementCart);
  const [pending, startTransition] = useTransition();
  const productHref = item.slug ? `/products/${item.slug}` : null;
  const showCompare =
    Boolean(productHref) && item.compareAtPrice != null && item.compareAtPrice > item.currentPrice;

  const onAddCart = () => {
    const variantId = item.variantId;
    if (!variantId) {
      toast.error("Tidak ada varian yang dapat ditambahkan ke keranjang.");
      return;
    }
    startTransition(async () => {
      const res = await addVariantToCart(variantId, 1);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      incrementCart(1);
      toast.success("Ditambahkan ke keranjang.");
      router.refresh();
    });
  };

  const media = (
    <>
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.imageAlt ?? item.name}
          fill
          sizes="(max-width: 640px) 45vw, 208px"
          className="object-contain p-2"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase">
          Tanpa gambar
        </div>
      )}
    </>
  );

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {productHref ? (
        <Link href={productHref} className="relative block aspect-square">
          {media}
        </Link>
      ) : (
        <div className="relative block aspect-square">{media}</div>
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {item.eyebrow ? (
          <p className="line-clamp-1 text-[11px] text-neutral-500">{item.eyebrow}</p>
        ) : null}
        {productHref ? (
          <Link
            href={productHref}
            className="line-clamp-2 min-h-10 text-sm leading-snug font-semibold text-black hover:text-brand"
          >
            {item.name}
          </Link>
        ) : (
          <p className="line-clamp-2 min-h-10 text-sm leading-snug font-semibold text-black">
            {item.name}
          </p>
        )}
        {item.variantName ? (
          <p className="line-clamp-1 text-[14px] text-neutral-500">{item.variantName}</p>
        ) : null}
        <div className="mt-auto space-y-0.5">
          {productHref ? (
            <p className="text-sm font-bold text-black">{formatRupiah(item.currentPrice)}</p>
          ) : (
            <p className="text-sm font-bold text-neutral-500">—</p>
          )}
          {showCompare ? (
            <p className="text-xs text-neutral-400 line-through">
              {formatRupiah(item.compareAtPrice!)}
            </p>
          ) : null}
        </div>
        {productHref ? (
          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-amber-400"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="font-medium text-neutral-800">{item.rating.toFixed(1)}</span>
            <span className="text-neutral-300">·</span>
            <span>{item.reviewCount} ulasan</span>
            <span className="text-neutral-300">·</span>
            <span>{item.soldCount} terjual</span>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500">
            Detail produk tidak tersedia. Anda tetap bisa menghapus dari wishlist.
          </p>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending || !item.variantId}
          onClick={onAddCart}
          className="mt-1 w-full"
        >
          + Keranjang
        </Button>

        <WishlistRemoveButton wishlistId={item.wishlistId} className="mt-1 w-full" />
      </div>
    </article>
  );
}
