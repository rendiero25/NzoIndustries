"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS_CHANGED } from "@/components/layout/notification-bell";
import { markNotificationsRead } from "@/server/actions/account/notifications";
import type { MyNotification } from "@/server/queries/account";

const time = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function NotificationList({ items }: { items: MyNotification[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.some((n) => !n.readAt);

  const mark = (id?: string) =>
    start(async () => {
      const res = await markNotificationsRead({ id });
      if (!res.ok) toast.error(res.error);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
      router.refresh();
    });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Belum ada notifikasi"
        description="Kabar pesanan dan promo akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unread ? (
        <div>
          <Button variant="outline" size="sm" onClick={() => mark()} disabled={pending}>
            <CheckCheck className="size-4" /> Tandai semua dibaca
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {items.map((n) => {
          const body = (
            <div className="flex flex-col gap-0.5 text-sm">
              <span className={cn("font-medium", n.readAt && "text-muted-foreground")}>
                {n.title}
              </span>
              {n.body ? <span className="text-muted-foreground">{n.body}</span> : null}
              <span className="text-caption text-muted-foreground">
                {time.format(new Date(n.createdAt))} WIB
              </span>
            </div>
          );
          return (
            <li
              key={n.id}
              className={cn("flex items-start gap-3 p-4", !n.readAt && "bg-steel-50/60")}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.readAt ? "bg-transparent" : "bg-signal",
                )}
                aria-label={n.readAt ? undefined : "Belum dibaca"}
              />
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => {
                      if (n.readAt) return;
                      void markNotificationsRead({ id: n.id }).then(() =>
                        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)),
                      );
                    }}
                    className="hover:underline"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </div>
              {!n.readAt ? (
                <Button size="sm" variant="ghost" onClick={() => mark(n.id)} disabled={pending}>
                  Tandai dibaca
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
