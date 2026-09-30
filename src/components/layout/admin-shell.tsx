"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  products: "Produk",
  brands: "Merek",
  categories: "Kategori",
  orders: "Pesanan",
  customers: "Pelanggan",
  reviews: "Ulasan",
  complaints: "Komplain",
  coupons: "Kupon",
  promotions: "Promosi",
  "main-banner": "Main Banner",
  "flash-sale": "Flash Sale",
  "second-products": "Produk Second",
  "featured-products": "Rekomendasi",
  "home-sections": "Tampilan Beranda",
  reports: "Laporan",
  stock: "Stok",
  notifications: "Notifikasi",
  settings: "Pengaturan",
  new: "Baru",
  edit: "Edit",
};

function isIdSegment(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(s) || /^\d+$/.test(s) || s.startsWith("GT-");
}

function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const relevant = segments.filter((s) => !isIdSegment(s));

  if (relevant.length <= 1) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:flex">
          <BreadcrumbLink asChild>
            <Link href="/admin">Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {relevant.slice(1).map((seg, i) => {
          const isLast = i === relevant.slice(1).length - 1;
          const label = SEGMENT_LABELS[seg] ?? seg;
          const rawIdx = segments.lastIndexOf(seg);
          const href = "/" + segments.slice(0, rawIdx + 1).join("/");

          return (
            <React.Fragment key={`${seg}-${i}`}>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

type AdminShellProps = {
  children: React.ReactNode;
  sidebarDefaultOpen?: boolean;
};

export function AdminShell({ children, sidebarDefaultOpen = true }: AdminShellProps) {
  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <AdminSidebar />
      <SidebarInset className="bg-[#fafafa]">
        <header className="flex h-11 shrink-0 items-center gap-2.5 bg-[#fafafa] px-4">
          <SidebarTrigger className="-ml-1 text-[#5c5c5c] hover:text-[#1d1d1f]" />
          <span className="text-sm text-[#d4d4d4] select-none">|</span>
          <AdminBreadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
              aria-label="Buka website"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden lg:inline">Ke Web NZO Industries</span>
            </Link>
            <AdminNotificationBell />
          </div>
        </header>
        <div className="w-full flex-1 px-4 pt-5 pb-12 sm:px-5 md:px-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
