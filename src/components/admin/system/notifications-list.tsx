"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markStaffNotificationsRead } from "@/server/actions/admin/system";
import type { StaffNotification } from "@/server/queries/admin/system";

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export function StaffNotificationsList({ items }: { items: StaffNotification[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.readAt).length;

  const markAll = () =>
    start(async () => {
      const res = await markStaffNotificationsRead();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });

  if (!items.length) {
    return (
      <EmptyState
        icon={Bell}
        title="Belum ada notifikasi"
        description="Stok menipis dan pembayaran yang masuk setelah pesanan batal akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {unread ? `${unread} belum dibaca` : "Semua sudah dibaca"}
        </span>
        <Button variant="outline" size="sm" disabled={!unread || pending} onClick={markAll}>
          <CheckCheck /> Tandai semua dibaca
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {items.map((n) => {
          const body = (
            <div className={cn("flex flex-col gap-0.5 p-4", !n.readAt && "bg-signal-soft/40")}>
              <span className="flex items-center gap-2 text-sm font-medium">
                {!n.readAt ? (
                  <span className="size-2 rounded-full bg-signal" aria-label="Belum dibaca" />
                ) : null}
                {n.title}
              </span>
              {n.body ? <span className="text-sm text-muted-foreground">{n.body}</span> : null}
              <span className="text-caption text-muted-foreground">
                {date.format(new Date(n.createdAt))}
              </span>
            </div>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} className="block hover:bg-muted">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
