import { create } from "zustand";

export type StoreNotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown> | null;
};

type NotificationState = {
  items: StoreNotifItem[];
  unread: number;
  /** true = data sudah di-fetch dari API, false = stale/belum fetch */
  fetched: boolean;
  loading: boolean;
  /** Isi store setelah fetch API */
  hydrate: (items: StoreNotifItem[], unread: number) => void;
  /** Tandai satu notif sudah dibaca (optimistic) */
  markRead: (id: string) => void;
  /** Tandai semua sudah dibaca (optimistic) */
  markAllRead: () => void;
  setLoading: (v: boolean) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unread: 0,
  fetched: false,
  loading: false,

  hydrate: (items, unread) => set({ items, unread, fetched: true, loading: false }),

  markRead: (id) =>
    set((s) => {
      const wasUnread = s.items.find((n) => n.id === id)?.is_read === false;
      return {
        items: s.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unread: wasUnread ? Math.max(0, s.unread - 1) : s.unread,
      };
    }),

  markAllRead: () =>
    set((s) => ({
      items: s.items.map((n) => ({ ...n, is_read: true })),
      unread: 0,
    })),

  setLoading: (v) => set({ loading: v }),
}));
