import { create } from "zustand";
import { devtools } from "zustand/middleware";

type CartState = {
  cartCount: number;
};

type CartActions = {
  incrementCart: (by?: number) => void;
  setCartCount: (count: number) => void;
};

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  devtools(
    (set) => ({
      cartCount: 0,

      incrementCart: (by = 1) =>
        set((s) => ({ cartCount: s.cartCount + by }), false, "incrementCart"),

      setCartCount: (count) => set({ cartCount: Math.max(0, count) }, false, "setCartCount"),
    }),
    { name: "cart-store" },
  ),
);
