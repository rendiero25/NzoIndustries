"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Gift, Heart, Home, KeyRound, MapPin, Package, User } from "lucide-react";

import { SidebarNotificationBadge } from "@/components/shared/sidebar-notification-badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV_PRIMARY: NavItem[] = [
  {
    label: "Ringkasan",
    description: "Ringkasan aktivitas akun",
    href: "/dashboard",
    icon: Home,
    exact: true,
  },
  {
    label: "Pesanan",
    description: "Lacak dan kelola pesanan",
    href: "/dashboard/orders",
    icon: Package,
  },
  {
    label: "Voucher",
    description: "Lihat voucher yang tersedia",
    href: "/dashboard/vouchers",
    icon: Gift,
  },
  {
    label: "Wishlist",
    description: "Produk yang Anda simpan",
    href: "/dashboard/wishlist",
    icon: Heart,
  },
  {
    label: "Notifikasi",
    description: "Pembaruan akun dan pesanan",
    href: "/dashboard/notifications",
    icon: Bell,
  },
];

const NAV_SECONDARY: NavItem[] = [
  {
    label: "Profil",
    description: "Perbarui informasi pribadi",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    label: "Alamat",
    description: "Kelola alamat pengiriman",
    href: "/dashboard/addresses",
    icon: MapPin,
  },
  {
    label: "Ganti Password",
    description: "Perbarui keamanan akun",
    href: "/dashboard/change-password",
    icon: KeyRound,
  },
];

type DashboardNavGroupProps = {
  items: NavItem[];
  unreadNotifications: number;
  isActive: (href: string, exact?: boolean) => boolean;
};

function DashboardNavGroup({ items, unreadNotifications, isActive }: DashboardNavGroupProps) {
  return (
    <SidebarMenu className="gap-1.5">
      {items.map((item) => {
        const active = isActive(item.href, item.exact);
        const Icon = item.icon;
        const badge =
          item.href === "/dashboard/notifications" && unreadNotifications > 0
            ? unreadNotifications
            : null;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              tooltip={item.label}
              isActive={active}
              className="h-auto min-h-16 items-start gap-3 rounded-xl px-3 py-3 text-foreground transition-colors group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:!items-center group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0 hover:bg-muted data-active:bg-muted data-active:text-foreground"
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-transparent text-foreground group-data-[collapsible=icon]:size-[22px]">
                  <Icon className="size-[22px]" />
                </span>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] leading-5 font-semibold">
                      {item.label}
                    </span>
                    {badge !== null && <SidebarNotificationBadge count={badge} />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function DashboardSidebar({
  unreadNotifications = 0,
  className,
  ...props
}: React.ComponentProps<typeof Sidebar> & { unreadNotifications?: number }) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      {...props}
      className={`!static !h-auto !border-0 !bg-transparent !p-0 [&>[data-sidebar=sidebar]]:bg-transparent ${className ?? ""}`}
    >
      <SidebarContent className="gap-4 overflow-visible bg-transparent p-0">
        <SidebarGroup className="rounded-md border border-black/5 bg-white p-2">
          <DashboardNavGroup
            items={NAV_PRIMARY}
            unreadNotifications={unreadNotifications}
            isActive={isActive}
          />
        </SidebarGroup>

        <SidebarGroup className="rounded-md border border-black/5 bg-white p-2">
          <DashboardNavGroup
            items={NAV_SECONDARY}
            unreadNotifications={unreadNotifications}
            isActive={isActive}
          />
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
