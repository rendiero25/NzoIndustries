"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markAllAdminNotificationsReadAction,
  markAdminNotificationReadAction,
} from "@/app/admin/(panel)/notifications/_actions";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import type { Json } from "@/types/legacy-supabase";

type Row = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Json;
};

const TYPE_LABEL: Record<string, string> = {
  new_order: "Pesanan",
  order_cancelled: "Pesanan",
  payment_confirmed: "Pembayaran",
  payment_issue: "Pembayaran",
  payment_expired: "Pembayaran",
  low_stock: "Stok",
  new_complaint: "Komplain",
  new_review: "Ulasan",
};

function getAdminNotificationUrl(type: string, data: Json): string | null {
  const obj = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const orderId = obj?.orderId as string | undefined;
  switch (type) {
    case "new_order":
    case "payment_confirmed":
    case "payment_issue":
    case "payment_expired":
    case "order_cancelled":
      return orderId ? `/admin/orders/${orderId}` : "/admin/orders";
    case "new_complaint":
      return orderId ? `/admin/orders/${orderId}` : "/admin/complaints";
    case "new_review":
      return "/admin/reviews";
    case "low_stock":
      return "/admin/stock";
    default:
      return orderId ? `/admin/orders/${orderId}` : null;
  }
}

export function AdminNotificationsPanel({ items }: { items: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRowClick = (n: Row) => {
    const url = getAdminNotificationUrl(n.type, n.data);
    if (!n.is_read) {
      markAdminNotificationReadAction(n.id).catch(() => {});
    }
    if (url) router.push(url);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.filter((i) => !i.is_read).length} belum dibaca
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await markAllAdminNotificationsReadAction();
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
      <ul className="divide-y divide-[#e0e0e0] rounded-xl border border-[#e0e0e0] bg-card">
        {items.map((n) => {
          const url = getAdminNotificationUrl(n.type, n.data);
          return (
            <li
              key={n.id}
              onClick={() => handleRowClick(n)}
              className={`px-4 py-4 transition-colors ${n.is_read ? "hover:bg-muted/40" : "bg-[#EA5329]/5 hover:bg-[#EA5329]/10"} ${url ? "cursor-pointer" : ""}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {TYPE_LABEL[n.type] && (
                    <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                      {TYPE_LABEL[n.type]}
                    </span>
                  )}
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    {formatRelativeDate(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(async () => {
                        const res = await markAdminNotificationReadAction(n.id);
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
