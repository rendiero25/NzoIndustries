"use client";

import {
  Bell,
  Car,
  Heart,
  LayoutDashboard,
  MapPin,
  Package,
  RotateCcw,
  Star,
  Ticket,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/account", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/account/orders", label: "Pesanan", icon: Package },
  { href: "/account/addresses", label: "Alamat", icon: MapPin },
  { href: "/account/garage", label: "Garasi", icon: Car },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/reviews", label: "Ulasan", icon: Star },
  { href: "/account/vouchers", label: "Voucher", icon: Ticket },
  { href: "/account/returns", label: "Retur & garansi", icon: RotateCcw },
  { href: "/account/notifications", label: "Notifikasi", icon: Bell },
  { href: "/account/profile", label: "Profil & keamanan", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/account" ? pathname === href : pathname.startsWith(href);
}

/** Navigasi dashboard user: sidebar (desktop), baris scroll horizontal (mobile). */
export function AccountNav({ unread }: { unread: number }) {
  const pathname = usePathname() ?? "/account";

  return (
    <>
      <nav aria-label="Menu akun" className="hidden lg:block">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                    active
                      ? "bg-steel-50 font-semibold text-foreground"
                      : "text-steel-700 hover:bg-steel-50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {href === "/account/notifications" && unread > 0 ? (
                    <span className="rounded-full bg-signal px-1.5 text-[0.6875rem] font-bold text-brand-black tabular-nums">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label="Menu akun" className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <ul className="flex gap-2 pb-1">
          {NAV.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center rounded-full border px-3.5 text-sm whitespace-nowrap",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-steel-700",
                  )}
                >
                  {label}
                  {href === "/account/notifications" && unread > 0 ? ` (${unread})` : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
