"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/money";

import { CartLineItem } from "./cart-line-item";
import { useCartMutations } from "./use-cart-mutations";
import { cartKey, useLiveCart } from "./use-live-cart";

const CHECKOUT_LOGIN = `/login?redirectTo=${encodeURIComponent("/checkout")}`;

/** Halaman `/cart`: daftar baris + ringkasan. Harga & stok dicek ulang server. */
export function CartView({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cart = useLiveCart();
  const { setQuantity, remove } = useCartMutations();

  if (!cart.hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Keranjang masih kosong"
        description="Cari part yang cocok untuk kendaraanmu, lalu tambahkan ke keranjang."
        action={{ label: "Belanja sekarang", href: "/products" }}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section aria-labelledby="cart-items">
        <h2 id="cart-items" className="sr-only">
          Isi keranjang
        </h2>
        <ul className="divide-y divide-border border-y border-border">
          {cart.items.map((item) => (
            <CartLineItem
              key={cartKey(item)}
              item={item}
              line={cart.lines?.get(cartKey(item))}
              onQuantity={(q) => setQuantity(item.productId, item.variantId, q)}
              onRemove={() => remove(item.productId, item.variantId)}
            />
          ))}
        </ul>
      </section>

      <aside
        aria-labelledby="cart-summary"
        className="flex flex-col gap-4 rounded-xl border border-border p-5 lg:sticky lg:top-36"
      >
        <h2 id="cart-summary" className="text-base">
          Ringkasan belanja
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Total harga ({cart.count} barang)</dt>
            <dd className="tabular-nums">{formatIDR(cart.subtotal)}</dd>
          </div>
          {cart.savings > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Kamu hemat</dt>
              <dd className="text-success tabular-nums">{formatIDR(cart.savings)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ongkir</dt>
            <dd className="text-muted-foreground">Dihitung saat checkout</dd>
          </div>
        </dl>
        <Separator />
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-semibold">Subtotal</span>
          <span className="text-lg font-bold tabular-nums">{formatIDR(cart.subtotal)}</span>
        </div>
        {cart.blocked ? (
          <p className="text-caption text-danger" role="alert">
            Ada produk yang stoknya kurang atau tidak tersedia. Ubah jumlah atau hapus dulu.
          </p>
        ) : null}
        {cart.blocked || cart.loading ? (
          <Button size="lg" disabled>
            {cart.loading ? "Memeriksa stok…" : "Lanjut ke checkout"}
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={isLoggedIn ? "/checkout" : CHECKOUT_LOGIN}>Lanjut ke checkout</Link>
          </Button>
        )}
        {!isLoggedIn ? (
          <p className="text-caption text-muted-foreground">
            Masuk atau daftar dulu untuk checkout. Isi keranjang tetap tersimpan.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
