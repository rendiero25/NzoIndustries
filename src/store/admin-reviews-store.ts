import { create } from "zustand";

interface AdminReviewsStore {
  count: number;
  setCount: (count: number) => void;
  increment: () => void;
  decrement: () => void;
}

export const useAdminReviewsStore = create<AdminReviewsStore>((set) => ({
  count: 0,
  setCount: (count) => set({ count: Math.max(0, count) }),
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
