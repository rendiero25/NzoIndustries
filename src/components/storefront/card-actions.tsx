"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleWishlist } from "@/server/actions/wishlist";

import { useAddToCart } from "./use-add-to-cart";

/**
 * Tombol ikon di kartu produk: tambah ke keranjang (produk bervarian diarahkan
 * ke PDP untuk memilih varian).
 */
export function CardCartButton({
  productId,
  slug,
  hasVariants,
}: {
  productId: string;
  slug: string;
  hasVariants?: boolean;
}) {
  const { add, pending } = useAddToCart();

  if (hasVariants) {
    return (
      <Button asChild variant="icon-chip" size="icon-sm" aria-label="Pilih varian">
        <Link href={`/products/${slug}`}>
          <ShoppingBag strokeWidth={1.75} />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="icon-chip"
      size="icon-sm"
      aria-label="Tambah ke keranjang"
      loading={pending}
      onClick={(e) => {
        const card = (e.currentTarget as HTMLElement).closest("article");
        add(
          { productId, variantId: null, quantity: 1 },
          { imageEl: card?.querySelector<HTMLElement>("[data-product-image]") },
        );
      }}
    >
      <ShoppingBag strokeWidth={1.75} />
    </Button>
  );
}

/** Ikon hati wishlist (wajib login; guest diarahkan ke /login). */
export function WishlistButton({
  productId,
  initialSaved,
  className,
  withLabel,
}: {
  productId: string;
  initialSaved: boolean;
  className?: string;
  withLabel?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [saved, setSaved] = useState(initialSaved);
  const [popKey, setPopKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleWishlist({ productId });
      if (!result.ok) {
        if (result.needsLogin) {
          toast.info(result.error);
          const back = `${pathname}${window.location.search}`;
          router.push(`/login?redirectTo=${encodeURIComponent(back)}`);
          return;
        }
        toast.error(result.error);
        return;
      }
      setSaved(result.saved);
      if (result.saved) setPopKey((k) => k + 1);
      toast.success(result.saved ? "Disimpan ke wishlist" : "Dihapus dari wishlist");
    });
  }

  return (
    <Button
      type="button"
      variant={withLabel ? "secondary" : "icon-chip"}
      size={withLabel ? "default" : "icon-sm"}
      aria-pressed={saved}
      aria-label={saved ? "Hapus dari wishlist" : "Simpan ke wishlist"}
      disabled={pending}
      onClick={toggle}
      className={className}
    >
      <Heart
        key={popKey}
        strokeWidth={1.75}
        className={cn(saved && "fill-danger text-danger", popKey > 0 && "motion-safe:animate-pop")}
      />
      {withLabel ? (saved ? "Tersimpan" : "Wishlist") : null}
    </Button>
  );
}
