import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Keranjang guest (Zustand + localStorage). Snapshot nama/harga hanya untuk
 * tampilan; harga final dihitung ulang server saat checkout (security rule 4).
 * Sinkron ke tabel `carts` saat login di Fase 5.
 */
export type CartItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  slug: string;
  name: string;
  variantName: string | null;
  price: number;
  imagePublicId: string | null;
  /** Stok saat ditambahkan (batas qty di UI; divalidasi ulang server). */
  stock: number;
  addedAt: number;
};

type CartState = {
  items: CartItem[];
  /** Penanda animasi badge (naik setiap item ditambahkan). */
  bumpKey: number;
};

type CartActions = {
  addItem: (item: Omit<CartItem, "addedAt">) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
  /** @deprecated keranjang legacy (dashboard wishlist lama, Fase 7). */
  incrementCart: (by?: number) => void;
};

export type CartStore = CartState & CartActions;

const MAX_LINES = 100;
const same = (i: CartItem, productId: string, variantId: string | null) =>
  i.productId === productId && i.variantId === variantId;

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      bumpKey: 0,
      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((i) => same(i, item.productId, item.variantId));
          const items = existing
            ? s.items.map((i) =>
                same(i, item.productId, item.variantId)
                  ? {
                      ...i,
                      ...item,
                      quantity: Math.min(i.quantity + item.quantity, item.stock),
                      addedAt: i.addedAt,
                    }
                  : i,
              )
            : [
                ...s.items,
                { ...item, quantity: Math.min(item.quantity, item.stock), addedAt: Date.now() },
              ].slice(-MAX_LINES);
          return { items, bumpKey: s.bumpKey + 1 };
        }),
      setQuantity: (productId, variantId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              same(i, productId, variantId)
                ? { ...i, quantity: Math.max(0, Math.min(quantity, i.stock || quantity)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      removeItem: (productId, variantId) =>
        set((s) => ({ items: s.items.filter((i) => !same(i, productId, variantId)) })),
      clear: () => set({ items: [] }),
      incrementCart: () => {},
    }),
    {
      name: "nzo-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      // Data keranjang versi lama (schema GeekyTech) diabaikan.
      migrate: () => ({ items: [] }),
    },
  ),
);

export const selectCartCount = (s: CartStore) => s.items.reduce((n, i) => n + i.quantity, 0);

/**
 * true setelah keranjang terbaca dari localStorage. Sebelum itu (render server
 * & hidrasi pertama) tampilkan 0 supaya markup server dan client sama.
 */
export function useCartHydrated(): boolean {
  // Persist localStorage terhidrasi sinkron saat store dibuat di client, jadi
  // cukup bedakan render server (false) dan client (true).
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const noopSubscribe = () => () => {};
