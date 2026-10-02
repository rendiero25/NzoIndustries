"use client";

import { useCallback, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(dashboard)/dashboard/notifications/_actions";
import {
  HEADER_DROPDOWN_MENU_CONTENT_CLASS,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import {
  formatNotificationBody,
  getNotificationTypeLabel,
} from "@/lib/notifications/format-notification-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationStore, type StoreNotifItem } from "@/store/notification-store";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

type NotifData = { orderId?: string; [key: string]: unknown } | null;

type NotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: NotifData;
};

type NotifAction = { kind: "url"; href: string };

function resolveNotifAction(notif: NotifItem): NotifAction {
  const orderId = notif.data?.orderId as string | undefined;

  switch (notif.type) {
    case "order_shipped":
    case "order_in_transit":
      return {
        kind: "url",
        href: orderId ? `/dashboard/orders/${orderId}/tracking` : "/dashboard/orders",
      };
    case "order_placed":
    case "order_update":
    case "payment_confirmed":
    case "payment_issue":
    case "payment_expired":
    case "order_delivered":
      return {
        kind: "url",
        href: orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders",
      };
    case "welcome":
      return { kind: "url", href: "/dashboard" };
    default:
      return { kind: "url", href: "/dashboard/notifications" };
  }
}

const NOTIF_ITEM_CLASS =
  "block w-full border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand/40";

function NotificationListItemContent({ notif }: { notif: NotifItem }) {
  const body = formatNotificationBody(notif);
  const typeLabel = getNotificationTypeLabel(notif.type);

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-5 w-2 shrink-0 items-center justify-center pt-0.5" aria-hidden>
        <span
          className={cn("h-1.5 w-1.5 rounded-full", !notif.is_read ? "bg-brand" : "bg-transparent")}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-semibold tracking-[0.04em] text-brand uppercase">
            {typeLabel}
          </span>
          <time
            dateTime={notif.created_at}
            className="shrink-0 text-[11px] leading-none text-muted-foreground tabular-nums"
          >
            {formatRelativeDate(notif.created_at)}
          </time>
        </div>
        <p className="mt-1 truncate text-[14px] leading-[1.29] font-semibold text-foreground">
          {notif.title}
        </p>
        {body ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.43] font-normal text-steel-700">
            {body}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // ── Shared notification store ──────────────────────────────────────────────
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const loading = useNotificationStore((s) => s.loading);
  const fetched = useNotificationStore((s) => s.fetched);
  const hydrate = useNotificationStore((s) => s.hydrate);
  const storeMarkRead = useNotificationStore((s) => s.markRead);
  const storeMarkAllRead = useNotificationStore((s) => s.markAllRead);
  const setLoading = useNotificationStore((s) => s.setLoading);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refetch setiap kali bell dibuka (untuk notif baru), tapi skeleton loading
  // hanya tampil saat belum pernah ada data — kalau data sudah ada, refresh
  // terjadi diam-diam di background tanpa mengganggu tampilan yang sudah ada.
  const fetchNotifs = useCallback(async () => {
    if (!fetched) setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = (await res.json()) as { items: StoreNotifItem[]; unread: number };
        hydrate(data.items ?? [], data.unread ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [fetched, hydrate, setLoading]);

  // Fetch on mount (untuk badge unread di header)
  useEffect(() => {
    void fetchNotifs();
  }, [fetchNotifs]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      setOpen(true);
      void fetchNotifs();
    }, 80);
  }, [fetchNotifs]);

  const handleMouseLeave = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        void fetchNotifs();
      }
    },
    [fetchNotifs],
  );

  const handleMarkAllRead = () => {
    startTransition(async () => {
      // Optimistic update — bell badge langsung hilang
      storeMarkAllRead();
      await markAllNotificationsReadAction();
    });
  };

  const handleNotifClick = useCallback(
    (notif: NotifItem) => {
      if (!notif.is_read) {
        storeMarkRead(notif.id);
        void markNotificationReadAction(notif.id);
      }
      setOpen(false);
    },
    [storeMarkRead],
  );

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative text-neutral-600"
            aria-label="Notifikasi"
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] leading-none font-black text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className={cn("w-[min(100vw-2rem,22rem)]", HEADER_DROPDOWN_MENU_CONTENT_CLASS)}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <HeaderDropdownPanelHeader
            title="Notifikasi"
            badge={
              unread > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-semibold tabular-nums">
                  {unread}
                </span>
              ) : null
            }
          />

          <div
            className="max-h-80 overflow-y-auto bg-white"
            role="list"
            aria-label="Daftar notifikasi"
          >
            {loading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-border px-4 py-3.5 last:border-b-0">
                    <div className="flex gap-3">
                      <div className="h-5 w-2 shrink-0 animate-pulse rounded bg-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex justify-between gap-2">
                          <div className="h-2.5 w-14 animate-pulse rounded bg-muted" />
                          <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="h-3.5 w-44 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-muted-foreground/50" aria-hidden />
                <p className="text-[14px] leading-[1.43] text-muted-foreground">
                  Belum ada notifikasi
                </p>
              </div>
            ) : (
              items.map((notif) => {
                const action = resolveNotifAction(notif);
                const itemClass = cn(
                  NOTIF_ITEM_CLASS,
                  !notif.is_read ? "bg-muted hover:bg-muted" : "bg-white hover:bg-muted",
                );

                return (
                  <Link
                    key={notif.id}
                    href={action.href}
                    role="listitem"
                    className={itemClass}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <NotificationListItemContent notif={notif} />
                  </Link>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={pending}
              disabled={unread === 0}
              onClick={handleMarkAllRead}
              className="h-auto gap-1.5 px-2 py-1.5 text-[13px] text-foreground hover:text-brand"
            >
              <CheckCheck size={14} aria-hidden />
              Tandai semua dibaca
            </Button>
            <Button asChild variant="link" size="sm" className="h-auto px-3 py-1.5 text-[13px]">
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)}>
                Lihat selengkapnya
              </Link>
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
