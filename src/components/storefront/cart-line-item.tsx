"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/catalog/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/server/queries/cart";
import type { CartItem } from "@/store/cart-store";

type Props = {
  item: CartItem;
  line: CartLine | undefined;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  compact?: boolean;
};

/** Pesan status baris dari cek server (design-system §5 keranjang). */
function lineNotice(line: CartLine | undefined) {
  if (!line) return null;
  if (line.status === "unavailable") {
    return { tone: "danger" as const, text: "Tidak tersedia. Hapus dari keranjang." };
  }
  if (line.status === "insufficient") {
    return line.available > 0
      ? { tone: "danger" as const, text: `Stok tinggal ${line.available}. Kurangi jumlahnya.` }
      : { tone: "danger" as const, text: "Stok habis. Hapus dari keranjang." };
  }
  if (line.available <= 5) {
    return { tone: "muted" as const, text: `Stok tinggal ${line.available}.` };
  }
  return null;
}

export function CartLineItem({ item, line, onQuantity, onRemove, compact = false }: Props) {
  const price = line?.unitPrice ?? item.price;
  const max = Math.max(1, line ? Math.max(line.available, 1) : item.stock || 999);
  const notice = lineNotice(line);
  const href = item.slug
    ? `/products/${item.slug}${item.variantId ? `?v=${item.variantId}` : ""}`
    : null;
  const unavailable = line?.status === "unavailable";

  return (
    <li className={cn("flex gap-3", compact ? "py-3" : "py-5 sm:gap-4")}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg border border-border bg-steel-50",
          compact ? "size-16" : "size-20 sm:size-24",
          unavailable && "opacity-50",
        )}
      >
        <ProductImage publicId={item.imagePublicId} alt={item.name} sizes="96px" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {href ? (
              <Link href={href} className="line-clamp-2 text-sm font-medium hover:underline">
                {item.name}
              </Link>
            ) : (
              <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
            )}
            {item.variantName ? (
              <p className="text-caption text-muted-foreground">{item.variantName}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-mt-1 -mr-2 shrink-0 text-muted-foreground"
            onClick={onRemove}
            aria-label={`Hapus ${item.name} dari keranjang`}
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{formatIDR(price)}</span>
          {line?.isFlashSale ? (
            <Badge className="bg-signal text-brand-black hover:bg-signal">Flash sale</Badge>
          ) : null}
        </div>

        {notice ? (
          <p
            className={cn(
              "text-caption",
              notice.tone === "danger" ? "text-danger" : "text-muted-foreground",
            )}
            role={notice.tone === "danger" ? "alert" : undefined}
          >
            {notice.text}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <QuantityStepper
            value={item.quantity}
            max={max}
            size="compact"
            disabled={unavailable}
            onDecrease={() => onQuantity(item.quantity - 1)}
            onIncrease={() => onQuantity(item.quantity + 1)}
          />
          {!compact ? (
            <span className="text-sm font-semibold tabular-nums">
              {formatIDR(price * item.quantity)}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
