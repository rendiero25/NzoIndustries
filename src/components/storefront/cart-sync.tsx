"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { syncCart } from "@/server/actions/cart";
import type { CartLine } from "@/server/queries/cart";
import { useCartStore, type CartItem } from "@/store/cart-store";

/** Baris server → item store (snapshot tampilan). */
export function lineToCartItem(line: CartLine): Omit<CartItem, "addedAt"> {
  return {
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    slug: line.slug ?? "",
    name: line.name ?? "Produk",
    variantName: line.variantName,
    price: line.unitPrice,
    imagePublicId: line.imagePublicId,
    stock: line.available,
  };
}

/**
 * Sinkron keranjang dengan tabel `carts` (D-28):
 * - login dan isi milik guest: gabungkan ke server, lalu pakai isi server;
 * - login dan isi milik user ini: muat ulang dari server (perangkat lain);
 * - logout: kosongkan isi lokal milik user sebelumnya.
 */
export function CartSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    const state = useCartStore.getState();
    if (!userId) {
      if (state.ownerId) state.replaceItems([], null);
      return;
    }

    let cancelled = false;
    const guest =
      state.ownerId === userId
        ? []
        : state.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          }));
    void syncCart(guest).then((res) => {
      if (cancelled || !res.ok) return;
      useCartStore.getState().replaceItems(res.lines.map(lineToCartItem), userId);
      if (res.removed > 0) {
        toast.info(`${res.removed} produk tidak tersedia dihapus dari keranjang.`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
