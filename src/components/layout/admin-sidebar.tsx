"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronRight,
  ExternalLink,
  FileBarChart,
  FileText,
  Grid2X2,
  ImageIcon,
  LayoutList,
  Layers,
  LogOut,
  Package,
  RotateCcw,
  PackageSearch,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Ticket,
  Users,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useAdminOrdersStore } from "@/store/admin-orders-store";
import { useAdminReviewsStore } from "@/store/admin-reviews-store";
import { createClient } from "@/lib/supabase/legacy/client";
import { useAdminSidebarCounts } from "@/lib/admin/use-admin-sidebar-counts";
import { SidebarNotificationBadge } from "@/components/shared/sidebar-notification-badge";
import {
  HEADER_DROPDOWN_MENU_CONTENT_CLASS,
  HEADER_DROPDOWN_MENU_ITEM_CLASS,
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  collapsible?: boolean;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: BarChart3, exact: true }],
  },
  {
    label: "Katalog",
    items: [
      { label: "Produk", href: "/admin/products", icon: Package },
      { label: "Merek", href: "/admin/brands", icon: Building2 },
      { label: "Kategori", href: "/admin/categories", icon: Grid2X2 },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { label: "Pesanan", href: "/admin/orders", icon: ShoppingBag },
      { label: "Pelanggan", href: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "Konten",
    items: [
      { label: "Ulasan", href: "/admin/reviews", icon: Star },
      { label: "Komplain", href: "/admin/complaints", icon: FileText },
      { label: "Retur", href: "/admin/returns", icon: RotateCcw },
      { label: "Kupon", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Promosi",
    collapsible: true,
    items: [
      { label: "Main Banner", href: "/admin/promotions/main-banner", icon: ImageIcon },
      { label: "Flash Sale", href: "/admin/promotions/flash-sale", icon: Zap },
      { label: "Produk Second", href: "/admin/promotions/second-products", icon: PackageSearch },
      { label: "Rekomendasi", href: "/admin/promotions/featured-products", icon: Star },
      { label: "Tampilan Beranda", href: "/admin/promotions/home-sections", icon: LayoutList },
    ],
  },
  {
    label: "Laporan & Stok",
    items: [
      { label: "Laporan", href: "/admin/reports", icon: FileBarChart },
      { label: "Stok", href: "/admin/stock", icon: Layers },
    ],
  },
  {
    label: "Sistem",
    items: [
      { label: "Notifikasi", href: "/admin/notifications", icon: Bell },
      { label: "Pengaturan", href: "/admin/settings", icon: Settings },
    ],
  },
];

function NavAdmin() {
  const { profile, user } = useAuth();
  const { reset } = useAuthStore();
  const { isMobile } = useSidebar();

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Admin";

  const initials = profile?.full_name
    ? profile.full_name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "A");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      window.location.href = "/admin/login";
    }
  };

  return (
    <SidebarMenu className="gap-1">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={displayName}
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email ?? ""}
                </span>
              </div>
              <Settings className="ml-auto size-4 shrink-0 text-sidebar-foreground/50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className={cn("w-56", HEADER_DROPDOWN_MENU_CONTENT_CLASS)}
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <HeaderDropdownPanelHeader title={displayName} />
            <HeaderDropdownPanelBody className="py-1">
              <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                <Link href="/admin/settings">
                  <User className="size-4" />
                  Profil Saya
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                <Link href="/admin/settings">
                  <Settings className="size-4" />
                  Pengaturan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                <Link href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Ke Web NZO Industries
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className={cn(
                  HEADER_DROPDOWN_MENU_ITEM_CLASS,
                  "border-t border-border text-destructive focus:bg-destructive/10 focus:text-destructive",
                )}
              >
                <LogOut className="size-4" />
                Keluar
              </DropdownMenuItem>
            </HeaderDropdownPanelBody>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function useUnviewedOrdersCount() {
  const count = useAdminOrdersStore((s) => s.count);
  const setCount = useAdminOrdersStore((s) => s.setCount);
  const increment = useAdminOrdersStore((s) => s.increment);
  const decrement = useAdminOrdersStore((s) => s.decrement);
  // Track IDs we know are unviewed — prevents double-decrement on repeated UPDATE events
  const trackedIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    fetch("/api/admin/orders/unviewed")
      .then((r) => r.json())
      .then((json: { items: { id: string }[]; count: number }) => {
        setCount(json.count ?? 0);
        trackedIds.current = new Set((json.items ?? []).map((o) => o.id));
      })
      .catch(() => {});
  }, [setCount]);

  // Stable refs so the realtime effect never needs to re-subscribe
  const incrementRef = React.useRef(increment);
  const decrementRef = React.useRef(decrement);
  React.useEffect(() => {
    incrementRef.current = increment;
  });
  React.useEffect(() => {
    decrementRef.current = decrement;
  });

  React.useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    // getSession() waits for session cookie load → realtime auth token set with
    // admin JWT before subscribe, so is_admin() RLS passes and events are received.
    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel("admin-sidebar-orders")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload) => {
            const o = payload.new as { id: string };
            trackedIds.current.add(o.id);
            incrementRef.current();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload) => {
            const updated = payload.new as { id: string; admin_viewed_at: string | null };
            if (updated.admin_viewed_at !== null && trackedIds.current.has(updated.id)) {
              trackedIds.current.delete(updated.id);
              decrementRef.current();
            }
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // stable — callbacks accessed via refs

  return count;
}

function useUnviewedReviewsCount() {
  const count = useAdminReviewsStore((s) => s.count);
  const setCount = useAdminReviewsStore((s) => s.setCount);
  const increment = useAdminReviewsStore((s) => s.increment);
  const decrement = useAdminReviewsStore((s) => s.decrement);
  const trackedIds = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    fetch("/api/admin/reviews/unread")
      .then((r) => r.json())
      .then((json: { count: number }) => {
        setCount(json.count ?? 0);
      })
      .catch(() => {});
  }, [setCount]);

  const incrementRef = React.useRef(increment);
  const decrementRef = React.useRef(decrement);
  React.useEffect(() => {
    incrementRef.current = increment;
  });
  React.useEffect(() => {
    decrementRef.current = decrement;
  });

  React.useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel("admin-sidebar-reviews")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_notifications" },
          (payload) => {
            const n = payload.new as { id: string; type: string };
            if (n.type !== "new_review") return;
            trackedIds.current.add(n.id);
            incrementRef.current();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "admin_notifications" },
          (payload) => {
            const n = payload.new as { id: string; type: string; is_read: boolean };
            if (n.type === "new_review" && n.is_read && trackedIds.current.has(n.id)) {
              trackedIds.current.delete(n.id);
              decrementRef.current();
            }
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return count;
}

export function AdminSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const unviewedCount = useUnviewedOrdersCount();
  const unreadReviewsCount = useUnviewedReviewsCount();
  const workloadCounts = useAdminSidebarCounts();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon" {...props} className={className}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="NZO Industries Admin">
              <Link href="/admin" aria-label="NZO Industries Admin — Dashboard">
                <Image
                  src="/logo.svg"
                  unoptimized
                  alt="NZO Industries"
                  width={130}
                  height={32}
                  className="shrink-0 object-contain object-left"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) =>
          group.collapsible ? (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                <Collapsible
                  asChild
                  defaultOpen={group.items.some((i) => isActive(i.href, i.exact))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={group.label}>
                        <Tag />
                        <span>{group.label}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.items.map((item) => {
                          const active = isActive(item.href, item.exact);
                          const Icon = item.icon;
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={active}
                                className="[&>svg]:text-current"
                              >
                                <Link href={item.href} aria-current={active ? "page" : undefined}>
                                  <Icon />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>
          ) : (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  const isOrders = item.href === "/admin/orders";
                  const isReviews = item.href === "/admin/reviews";
                  const isComplaints = item.href === "/admin/complaints";
                  const isReturns = item.href === "/admin/returns";
                  const isStock = item.href === "/admin/stock";
                  const isNotifications = item.href === "/admin/notifications";
                  const badge =
                    (isOrders && unviewedCount > 0 ? unviewedCount : null) ??
                    (isReviews && unreadReviewsCount > 0 ? unreadReviewsCount : null) ??
                    (isComplaints && workloadCounts.complaints > 0
                      ? workloadCounts.complaints
                      : null) ??
                    (isReturns && workloadCounts.returns > 0 ? workloadCounts.returns : null) ??
                    (isStock && workloadCounts.stock > 0 ? workloadCounts.stock : null) ??
                    (isNotifications && workloadCounts.notifications > 0
                      ? workloadCounts.notifications
                      : null);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild tooltip={item.label} isActive={active}>
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <Icon />
                          <span>{item.label}</span>
                          {badge !== null && <SidebarNotificationBadge count={badge} />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavAdmin />
      </SidebarFooter>
    </Sidebar>
  );
}
