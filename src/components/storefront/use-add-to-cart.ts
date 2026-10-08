"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { flyToCart } from "@/lib/motion/fly-to-cart";
import { validateCartAdd } from "@/server/actions/cart";
import { useCartStore } from "@/store/cart-store";

import { persistCartLine } from "./use-cart-mutations";

/**
 * Validasi ke server (published, varian, stok) → simpan ke keranjang guest →
 * animasi terbang + badge memantul → toast (design-system §8, §10).
 */
export function useAddToCart() {
  const addItem = useCartStore((s) => s.addItem);
  const [pending, startTransition] = useTransition();

  function add(
    input: { productId: string; variantId: string | null; quantity: number },
    opts: { imageEl?: HTMLElement | null; onAdded?: () => void } = {},
  ) {
    startTransition(async () => {
      const result = await validateCartAdd(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      flyToCart(opts.imageEl ?? null);
      addItem({ ...result.item, quantity: input.quantity });
      void persistCartLine(result.item.productId, result.item.variantId);
      toast.success("Ditambahkan ke keranjang", {
        description: result.item.variantName
          ? `${result.item.name} · ${result.item.variantName}`
          : result.item.name,
        action: { label: "Lihat keranjang", onClick: () => (window.location.href = "/cart") },
      });
      opts.onAdded?.();
    });
  }

  return { add, pending };
}
