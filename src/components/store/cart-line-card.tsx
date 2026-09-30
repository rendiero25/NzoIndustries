"use client";

import { memo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removeCartItemAction, updateCartItemQuantityAction } from "@/app/(public)/cart/_actions";
import { CartRemoveConfirmDialog } from "@/components/store/cart-remove-confirm-dialog";
import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { formatRupiah } from "@/lib/format";

export type CartLineView = {
  lineId: string;
  qty: number;
  maxQty: number;
  variantId: string;
  variantName: string;
  productId: string;
  productName: string;
  slug: string;
  categoryId: string | null;
  categoryLabel: string;
  brandId: string | null;
  descriptionExcerpt: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  listPrice: number;
  unitPrice: number;
  discountPercent: number | null;
  isFlashSale: boolean;
  images: { url: string; alt: string | null }[];
  sku: string;
  weightGrams: number;
};

function CartLineCardInner({
  line,
  checked,
  onToggle,
  readonly,
}: {
  line: CartLineView;
  checked?: boolean;
  onToggle?: (lineId: string) => void;
  readonly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const lineTotal = line.unitPrice * line.qty;

  const images = line.images;
  const hasCarousel = images.length > 1;
  const currentImg = images.length > 0 ? images[Math.min(imgIndex, images.length - 1)]! : null;

  const bumpQty = (delta: number) => {
    const next = line.qty + delta;
    if (next < 1 || next > line.maxQty) {
      if (next > line.maxQty) toast.error("Stok tidak mencukupi.");
      return;
    }
    startTransition(async () => {
      const res = await updateCartItemQuantityAction(line.lineId, next);
      if (res.success) {
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleConfirmRemove = () => {
    startTransition(async () => {
      const res = await removeCartItemAction(line.lineId);
      if (res.success) {
        setConfirmRemoveOpen(false);
        toast.success("Barang dihapus dari keranjang.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <article className="flex flex-col gap-4 sm:flex-row sm:gap-5">
        {onToggle !== undefined && (
          <div className="flex shrink-0 items-start pt-1 sm:pt-2">
            <Checkbox
              checked={checked ?? false}
              onCheckedChange={() => onToggle(line.lineId)}
              className="h-5 w-5"
              aria-label={`Pilih ${line.productName}`}
            />
          </div>
        )}
        <div className="relative mx-auto w-full max-w-[200px] shrink-0 sm:mx-0 sm:w-44">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            {currentImg?.url ? (
              <Image
                src={currentImg.url}
                alt={currentImg.alt ?? line.productName}
                fill
                className="object-contain p-2"
                sizes="200px"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-[10px] font-semibold text-[#9a9590] uppercase">
                Tanpa gambar
              </div>
            )}
            {hasCarousel ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-1.5 sm:px-2">
                <CarouselNavButton
                  direction="prev"
                  surface="on-photo"
                  aria-label="Gambar sebelumnya"
                  disabled={pending}
                  onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                  className="pointer-events-auto size-8 min-h-0 shrink-0 rounded-full border border-[#e0e0e0] bg-white/95 p-0 text-[#1d1d1f] shadow-sm hover:bg-white [&_svg]:size-4"
                />
                <CarouselNavButton
                  direction="next"
                  surface="on-photo"
                  aria-label="Gambar berikutnya"
                  disabled={pending}
                  onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                  className="pointer-events-auto size-8 min-h-0 shrink-0 rounded-full border border-[#e0e0e0] bg-white/95 p-0 text-[#1d1d1f] shadow-sm hover:bg-white [&_svg]:size-4"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/products/${line.slug}`}
            className="text-lg leading-snug font-bold text-[#1d1d1f] hover:text-[#EA5329]"
          >
            {line.productName}
          </Link>
          <p className="mt-0.5 text-xs font-semibold text-[#9a9590] uppercase">
            {line.categoryLabel}
          </p>
          <p className="mt-1 text-sm font-medium text-[#5c5c5c]">{line.variantName}</p>
          {line.isFlashSale && (
            <span
              aria-label="Flash Sale"
              className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#EA5329]/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#EA5329] uppercase"
            >
              ⚡ Flash Sale
            </span>
          )}
          {line.descriptionExcerpt ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#5c5c5c]">
              {line.descriptionExcerpt}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5c5c5c]">
            <span className="inline-flex items-center gap-1 font-medium text-[#1d1d1f]">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-amber-400"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {line.rating.toFixed(1)}
            </span>
            <span className="text-[#d4d0c8]">·</span>
            <span>{line.reviewCount} ulasan</span>
            <span className="text-[#d4d0c8]">·</span>
            <span>{line.soldCount} terjual</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-normal text-[#1d1d1f] tabular-nums">
                {formatRupiah(line.unitPrice)}
              </p>
              {line.listPrice > line.unitPrice ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#9a9590] line-through">
                    {formatRupiah(line.listPrice)}
                  </span>
                  {line.discountPercent != null ? (
                    <span className="text-sm font-bold text-[#EA5329]">
                      {line.discountPercent}%
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!readonly && (
              <div className="flex items-center gap-2">
                <QuantityStepper
                  value={line.qty}
                  min={1}
                  max={line.maxQty}
                  size="compact"
                  disabled={pending}
                  onDecrease={() => bumpQty(-1)}
                  onIncrease={() => bumpQty(1)}
                />
                <Button
                  type="button"
                  variant="destructive-ghost"
                  size="icon-sm"
                  aria-label="Hapus dari keranjang"
                  disabled={pending}
                  onClick={() => setConfirmRemoveOpen(true)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>
            )}
            {readonly && <p className="text-sm font-medium text-[#5c5c5c]">Qty: {line.qty}</p>}
          </div>

          <p className="mt-3 text-right text-xs font-semibold text-[#7a7a7a] sm:hidden">
            Subtotal baris: {formatRupiah(lineTotal)}
          </p>

          <p className="mt-5 hidden shrink-0 self-start text-left text-base font-bold text-[#1d1d1f] tabular-nums sm:block sm:pt-1 sm:text-xl">
            {formatRupiah(lineTotal)}
          </p>
        </div>
      </article>

      <CartRemoveConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        productName={line.productName}
        onConfirm={handleConfirmRemove}
        isLoading={pending}
      />
    </>
  );
}

export const CartLineCard = memo(CartLineCardInner);
