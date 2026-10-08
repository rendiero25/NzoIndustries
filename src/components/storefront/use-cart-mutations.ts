"use client";

import { toast } from "sonner";

import { setCartItem } from "@/server/actions/cart";
import { useCartStore } from "@/store/cart-store";

/** Simpan qty absolut ke tabel `carts` bila keranjang milik user login. */
export async function persistCartLine(productId: string, variantId: string | null): Promise<void> {
  const { ownerId, items } = useCartStore.getState();
  if (!ownerId) return;
  const quantity =
    items.find((i) => i.productId === productId && i.variantId === variantId)?.quantity ?? 0;
  const res = await setCartItem({ productId, variantId, quantity });
  if (!res.ok) toast.error(res.error);
}

/** Ubah/hapus baris keranjang: update lokal dulu (optimistic), lalu server. */
export function useCartMutations() {
  const setQuantityLocal = useCartStore((s) => s.setQuantity);
  const removeLocal = useCartStore((s) => s.removeItem);

  return {
    setQuantity(productId: string, variantId: string | null, quantity: number) {
      setQuantityLocal(productId, variantId, quantity);
      void persistCartLine(productId, variantId);
    },
    remove(productId: string, variantId: string | null) {
      removeLocal(productId, variantId);
      void persistCartLine(productId, variantId);
    },
  };
}
