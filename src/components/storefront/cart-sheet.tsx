"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatIDR } from "@/lib/money";

import { CartLineItem } from "./cart-line-item";
import { useCartMutations } from "./use-cart-mutations";
import { cartKey, useLiveCart } from "./use-live-cart";

/** Ringkasan cepat keranjang dari kanan (design-system §5). Detail di `/cart`. */
export function CartSheet({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {open ? <CartSheetBody isLoggedIn={isLoggedIn} onNavigate={() => setOpen(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function CartSheetBody({
  isLoggedIn,
  onNavigate,
}: {
  isLoggedIn: boolean;
  onNavigate: () => void;
}) {
  const cart = useLiveCart();
  const { setQuantity, remove } = useCartMutations();
  const checkoutHref = isLoggedIn
    ? "/checkout"
    : `/login?redirectTo=${encodeURIComponent("/checkout")}`;

  return (
    <>
      <SheetHeader className="border-b border-border px-5 py-4">
        <SheetTitle>Keranjang</SheetTitle>
        <SheetDescription>
          {cart.count > 0 ? `${cart.count} barang` : "Belum ada barang"}
        </SheetDescription>
      </SheetHeader>

      {cart.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-6 text-steel-700" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">Keranjang masih kosong.</p>
          <Button asChild variant="outline" onClick={onNavigate}>
            <Link href="/products">Belanja sekarang</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
            {cart.items.map((item) => (
              <CartLineItem
                key={cartKey(item)}
                compact
                item={item}
                line={cart.lines?.get(cartKey(item))}
                onQuantity={(q) => setQuantity(item.productId, item.variantId, q)}
                onRemove={() => remove(item.productId, item.variantId)}
              />
            ))}
          </ul>
          <SheetFooter className="gap-3 border-t border-border px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold tabular-nums">{formatIDR(cart.subtotal)}</span>
            </div>
            {cart.blocked ? (
              <p className="text-caption text-danger" role="alert">
                Ada produk yang stoknya kurang. Periksa di keranjang.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" onClick={onNavigate}>
                <Link href="/cart">Lihat keranjang</Link>
              </Button>
              {cart.blocked || cart.loading ? (
                <Button disabled>Checkout</Button>
              ) : (
                <Button asChild onClick={onNavigate}>
                  <Link href={checkoutHref}>Checkout</Link>
                </Button>
              )}
            </div>
          </SheetFooter>
        </>
      )}
    </>
  );
}
