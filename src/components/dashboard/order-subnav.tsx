"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { orderStatusLabel } from "@/lib/constants/order-status-labels";
import type { Database } from "@/types/legacy-supabase";
import { Button } from "@/components/ui/button";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const tabs = (orderId: string): { href: string; label: string; exact?: boolean }[] => [
  { href: `/dashboard/orders/${orderId}`, label: "Ringkasan", exact: true },
  { href: `/dashboard/orders/${orderId}/tracking`, label: "Lacak kiriman" },
  { href: `/dashboard/orders/${orderId}/invoice`, label: "Invoice" },
  { href: `/dashboard/orders/${orderId}/complaint`, label: "Komplain" },
];

export function OrderSubNav({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}) {
  const pathname = usePathname();
  const items = tabs(orderId);

  return (
    <div className="mb-8 w-full min-w-0 border-b border-[#e0e0e0] pb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold text-[#7a7a7a] uppercase">Pesanan</p>
          <h1 className="text-xl font-bold text-[#1d1d1f] sm:text-2xl">{orderNumber}</h1>
          <p className="mt-1 text-sm text-[#5c5c5c]">{orderStatusLabel(status)}</p>
        </div>
      </div>
      <nav
        className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        aria-label="Submenu pesanan"
      >
        {items.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Button
              key={tab.href}
              asChild
              variant={active ? "primary" : "pearl"}
              size="sm"
              className="shrink-0"
            >
              <Link href={tab.href}>{tab.label}</Link>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
