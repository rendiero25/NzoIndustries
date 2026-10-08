"use client";

import { useEffect, useMemo, useState } from "react";

import { getCartLines } from "@/server/actions/cart";
import type { CartLine } from "@/server/queries/cart";
import { useCartHydrated, useCartStore, type CartItem } from "@/store/cart-store";

export const cartKey = (i: { productId: string; variantId: string | null }) =>
  `${i.productId}:${i.variantId ?? ""}`;

export type LiveCart = {
  items: CartItem[];
  hydrated: boolean;
  /** Baris server per key; undefined selama memuat. */
  lines: Map<string, CartLine> | undefined;
  loading: boolean;
  subtotal: number;
  savings: number;
  count: number;
  /** Ada baris yang stoknya kurang / tidak tersedia. */
  blocked: boolean;
};

/**
 * Isi keranjang + harga/stok terkini dari server (dicek ulang setiap qty
 * berubah, debounce 350 ms). Subtotal memakai harga server, bukan snapshot.
 */
export function useLiveCart(): LiveCart {
  const items = useCartStore((s) => s.items);
  const hydrated = useCartHydrated();
  const signature = items.map((i) => `${cartKey(i)}=${i.quantity}`).join("|");
  const [result, setResult] = useState<{ sig: string; lines: Map<string, CartLine> }>();

  useEffect(() => {
    if (!hydrated) return;
    const current = useCartStore.getState().items;
    if (current.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await getCartLines(
        current.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      );
      if (cancelled || !res.ok) return;
      const lines = new Map(res.lines.map((l) => [cartKey(l), l]));
      setResult({ sig: signature, lines });
      // Perbarui snapshot harga/stok supaya batas qty & badge tetap akurat.
      const store = useCartStore.getState();
      const stale = store.items.some((i) => {
        const l = lines.get(cartKey(i));
        return (
          l && l.status !== "unavailable" && (l.unitPrice !== i.price || l.available !== i.stock)
        );
      });
      if (stale) {
        store.replaceItems(
          store.items.map((i) => {
            const l = lines.get(cartKey(i));
            return l && l.status !== "unavailable"
              ? { ...i, price: l.unitPrice, stock: l.available }
              : i;
          }),
          store.ownerId,
        );
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, hydrated]);

  return useMemo(() => {
    const lines = items.length === 0 ? new Map<string, CartLine>() : result?.lines;
    let subtotal = 0;
    let savings = 0;
    let blocked = false;
    for (const item of items) {
      const line = lines?.get(cartKey(item));
      const price = line ? line.unitPrice : item.price;
      subtotal += price * item.quantity;
      if (line && line.compareAtPrice && line.compareAtPrice > line.unitPrice) {
        savings += (line.compareAtPrice - line.unitPrice) * item.quantity;
      }
      if (line && line.status !== "ok") blocked = true;
    }
    return {
      items,
      hydrated,
      lines,
      loading: hydrated && items.length > 0 && result?.sig !== signature,
      subtotal,
      savings,
      count: items.reduce((n, i) => n + i.quantity, 0),
      blocked,
    };
  }, [items, hydrated, result, signature]);
}
