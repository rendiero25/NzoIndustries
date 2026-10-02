"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Gift,
  Heart,
  Home,
  KeyRound,
  MapPin,
  Package,
  User,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean };

export const ACCOUNT_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Belanja",
    items: [
      { label: "Ringkasan", href: "/dashboard", icon: Home, exact: true },
      { label: "Pesanan", href: "/dashboard/orders", icon: Package },
      { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
      { label: "Voucher", href: "/dashboard/vouchers", icon: Gift },
      { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    label: "Akun",
    items: [
      { label: "Profil", href: "/dashboard/profile", icon: User },
      { label: "Alamat", href: "/dashboard/addresses", icon: MapPin },
      { label: "Kata sandi", href: "/dashboard/change-password", icon: KeyRound },
    ],
  },
];

function useIsActive() {
  const pathname = usePathname() ?? "/dashboard";
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto rounded-full bg-signal px-1.5 text-[0.6875rem] leading-[1.125rem] font-bold text-brand-black tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Navigasi akun desktop (design-system.md §6). */
export function DashboardSidebar({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const isActive = useIsActive();

  return (
    <nav aria-label="Menu akun" className="hidden w-56 shrink-0 md:block">
      <div className="sticky top-28 flex flex-col gap-6">
        {ACCOUNT_NAV.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-caption text-muted-foreground">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ label, href, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                        active
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-steel-700 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                      {label}
                      {href === "/dashboard/notifications" && unreadNotifications > 0 ? (
                        <Badge count={unreadNotifications} />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Navigasi akun mobile: tab geser horizontal. */
export function DashboardMobileNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const isActive = useIsActive();
  const items = ACCOUNT_NAV.flatMap((g) => g.items);

  return (
    <nav aria-label="Menu akun" className="-mx-4 border-b border-border md:hidden">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto px-4">
        {items.map(({ label, href, exact }) => {
          const active = isActive(href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center gap-1.5 px-2.5 text-sm whitespace-nowrap",
                  active
                    ? "font-semibold text-foreground after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-foreground"
                    : "text-steel-700",
                )}
              >
                {label}
                {href === "/dashboard/notifications" && unreadNotifications > 0 ? (
                  <span
                    className="size-1.5 rounded-full bg-signal"
                    aria-label={`${unreadNotifications} belum dibaca`}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
