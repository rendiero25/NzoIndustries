"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(dashboard)/dashboard/notifications/_actions";
import { useNotificationStore } from "@/store/notification-store";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import { getNotificationTypeLabel } from "@/lib/notifications/format-notification-display";
import type { Json } from "@/types/supabase";

type Row = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Json | null;
};

function getNotificationUrl(type: string, data: Json | null): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const orderId = (data.orderId ?? data.order_id) as string | undefined;
  if (!orderId) return null;
  const status = data.status as string | undefined;
  const trackingTypes = ["order_shipped", "order_in_transit"];
  if (trackingTypes.includes(type) || status === "shipped") {
    return `/dashboard/orders/${orderId}/tracking`;
  }
  return `/dashboard/orders/${orderId}`;
}

export function NotificationsPanel({ items }: { items: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Sync ke bell header saat mark-as-read
  const storeMarkRead = useNotificationStore((s) => s.markRead);
  const storeMarkAllRead = useNotificationStore((s) => s.markAllRead);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#5c5c5c]">
          {items.filter((i) => !i.is_read).length} belum dibaca
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              // Optimistic update ke bell header langsung
              storeMarkAllRead();
              const res = await markAllNotificationsReadAction();
              if (res.success) {
                toast.success("Semua ditandai dibaca.");
                router.refresh();
              } else {
                toast.error(res.error);
              }
            });
          }}
        >
          Tandai semua dibaca
        </Button>
      </div>
      <ul className="divide-y divide-[#e0e0e0] rounded-xl border border-[#e0e0e0] bg-white">
        {items.map((n) => {
          const url = getNotificationUrl(n.type, n.data);
          return (
            <li key={n.id} className={`px-4 py-4 ${n.is_read ? "bg-white" : "bg-[#fafafa]"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="mb-1 inline-block rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-semibold text-[#7a7a7a] uppercase">
                    {getNotificationTypeLabel(n.type)}
                  </span>
                  <p className="font-semibold text-[#1d1d1f]">{n.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#5c5c5c]">{n.body}</p>
                  <p className="mt-2 text-xs text-[#7a7a7a]">{formatRelativeDate(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {url && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (!n.is_read) {
                          storeMarkRead(n.id);
                          markNotificationReadAction(n.id).catch(() => {});
                        }
                        router.push(url);
                      }}
                    >
                      Lihat
                    </Button>
                  )}
                  {!n.is_read && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          storeMarkRead(n.id);
                          const res = await markNotificationReadAction(n.id);
                          if (res.success) {
                            router.refresh();
                          } else {
                            toast.error(res.error);
                          }
                        });
                      }}
                    >
                      Tandai dibaca
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
