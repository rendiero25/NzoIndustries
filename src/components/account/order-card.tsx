import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/catalog/product-image";
import { formatIDR } from "@/lib/money";
import { orderStatusMeta } from "@/lib/orders/status";
import type { OrderListItem } from "@/server/queries/account";

import { StatusBadge } from "./status-badge";

export const dateShort = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const dateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Kartu ringkas satu pesanan (daftar pesanan & ringkasan akun). */
export function OrderCard({ order }: { order: OrderListItem }) {
  const meta = orderStatusMeta(order.status);
  return (
    <Link
      href={`/account/orders/${order.orderNumber}`}
      className="group flex flex-col gap-3 rounded-xl border border-border p-4 transition-colors hover:border-steel-500"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="font-mono font-semibold">{order.orderNumber}</span>
          <span className="text-muted-foreground">
            {dateShort.format(new Date(order.createdAt))}
          </span>
        </span>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-steel-50">
          <ProductImage
            publicId={order.firstItem?.imagePublicId}
            alt={order.firstItem?.name ?? "Produk"}
            sizes="56px"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col text-sm">
          <span className="line-clamp-1 font-medium">{order.firstItem?.name ?? "Pesanan"}</span>
          <span className="text-caption text-muted-foreground">
            {order.itemCount} barang
            {order.moreItems > 0 ? ` · +${order.moreItems} produk lain` : ""}
          </span>
        </div>
        <div className="flex flex-col items-end text-sm">
          <span className="text-caption text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">{formatIDR(order.grandTotal)}</span>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
