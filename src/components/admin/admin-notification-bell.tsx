"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import {
  markAllAdminNotificationsReadAction,
  markAdminNotificationReadAction,
} from "@/app/admin/(panel)/notifications/_actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/legacy/client";

type NotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown> | null;
};

function getAdminNotificationUrl(
  type: string,
  data: Record<string, unknown> | null,
): string | null {
  const orderId = data?.orderId as string | undefined;
  const complaintId = data?.complaintId as string | undefined;
  switch (type) {
    case "return_shipped_back":
      return complaintId ? `/admin/complaints/${complaintId}` : "/admin/returns";
    case "new_order":
    case "payment_confirmed":
    case "payment_issue":
    case "payment_expired":
    case "order_cancelled":
      return orderId ? `/admin/orders/${orderId}` : "/admin/orders";
    case "new_complaint":
    case "complaint_reply":
      return orderId ? `/admin/orders/${orderId}` : "/admin/complaints";
    case "new_review":
      return "/admin/reviews";
    case "low_stock":
      return "/admin/stock";
    default:
      return orderId ? `/admin/orders/${orderId}` : null;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
}

const TYPE_LABEL: Record<string, string> = {
  new_order: "Pesanan",
  order_cancelled: "Pesanan",
  payment_confirmed: "Pembayaran",
  payment_issue: "Pembayaran",
  payment_expired: "Pembayaran",
  low_stock: "Stok",
  new_complaint: "Komplain",
  complaint_reply: "Komplain",
  return_shipped_back: "Retur",
  new_review: "Ulasan",
};

export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const fetchedRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (fetchedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = (await res.json()) as { items: NotifItem[]; unread: number };
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
        fetchedRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifs();
  }, [fetchNotifs]);

  // Realtime subscription — listen for new notifications without polling.
  // getSession() ensures the Supabase client finishes loading the session from
  // cookies before we subscribe, so realtime connects with the admin JWT instead
  // of anon (which would fail the is_admin() RLS check and receive no events).
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel("admin-notifications-bell")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_notifications" },
          (payload) => {
            const notif = payload.new as NotifItem;
            setItems((prev) => [notif, ...prev].slice(0, 6));
            setUnread((prev) => prev + 1);
            fetchedRef.current = false;
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

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
        fetchedRef.current = false;
        void fetchNotifs();
      }
    },
    [fetchNotifs],
  );

  const router = useRouter();

  const handleItemClick = (notif: NotifItem) => {
    const url = getAdminNotificationUrl(notif.type, notif.data);
    if (!notif.is_read) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
      markAdminNotificationReadAction(notif.id).catch(() => {});
    }
    setOpen(false);
    if (url) router.push(url);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllAdminNotificationsReadAction();
      if (res.success) {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnread(0);
      }
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative text-muted-foreground hover:text-foreground"
            aria-label="Notifikasi admin"
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EA5329] text-[9px] leading-none font-black text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[min(100vw-2rem,22rem)] gap-0 overflow-hidden rounded-[14px] p-0"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
            <span className="text-[14px] leading-[1.29] font-semibold text-foreground">
              Notifikasi
            </span>
            {unread > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EA5329] px-1.5 text-[10px] font-semibold text-white tabular-nums">
                {unread}
              </span>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-border px-4 py-3 last:border-b-0">
                    <div className="mb-2 h-3 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-56 animate-pulse rounded bg-muted" />
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
                const url = getAdminNotificationUrl(notif.type, notif.data);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "border-b border-border px-4 py-3 transition-colors last:border-b-0",
                      !notif.is_read ? "bg-[#EA5329]/5 hover:bg-[#EA5329]/10" : "hover:bg-muted/40",
                      url && "cursor-pointer",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!notif.is_read ? (
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA5329]"
                          aria-hidden
                        />
                      ) : null}
                      <div className={cn("min-w-0 flex-1", notif.is_read && "pl-0")}>
                        {TYPE_LABEL[notif.type] ? (
                          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                            {TYPE_LABEL[notif.type]}
                          </span>
                        ) : null}
                        <p className="mt-1 truncate text-[14px] leading-[1.29] font-semibold text-foreground">
                          {notif.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.43] font-normal text-muted-foreground">
                          {notif.body}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-none text-muted-foreground/70">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/50 px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={pending}
              disabled={unread === 0}
              onClick={handleMarkAllRead}
              className="h-auto gap-1.5 px-2 py-1.5 text-[13px] text-muted-foreground hover:text-[#EA5329]"
            >
              <CheckCheck size={14} className="shrink-0" aria-hidden />
              Tandai semua dibaca
            </Button>
            <Button asChild variant="link" size="sm" className="h-auto px-3 py-1.5 text-[13px]">
              <Link href="/admin/notifications" onClick={() => setOpen(false)}>
                Lihat selengkapnya
              </Link>
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
