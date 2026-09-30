"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const SEGMENT_LABELS: Record<string, string> = {
  orders: "Pesanan",
  wishlist: "Wishlist",
  notifications: "Notifikasi",
  addresses: "Alamat",
  profile: "Profil",
  vouchers: "Voucher",
  "change-password": "Ganti Password",
  new: "Baru",
  edit: "Edit",
  tracking: "Lacak Pesanan",
  invoice: "Invoice",
  review: "Ulasan",
  complaint: "Komplain",
};

function isIdSegment(s: string) {
  return s.startsWith("GT-") || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(s) || /^\d+$/.test(s);
}

function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const relevant = segments.slice(1).filter((s) => !isIdSegment(s));

  if (relevant.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Ringkasan</BreadcrumbPage>
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
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {relevant.map((seg, i) => {
          const isLast = i === relevant.length - 1;
          const label = SEGMENT_LABELS[seg] ?? seg;
          const rawIdx = segments.indexOf(seg, 1);
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

type DashboardShellProps = {
  children: React.ReactNode;
  unreadNotifications?: number;
  sidebarDefaultOpen?: boolean;
};

export function DashboardShell({
  children,
  unreadNotifications = 0,
  sidebarDefaultOpen = true,
}: DashboardShellProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-24">
      <SidebarProvider
        defaultOpen={sidebarDefaultOpen}
        className="!min-h-0 items-start gap-5 bg-transparent py-6 lg:gap-7 lg:py-8"
        style={{ "--sidebar-width": "18.5rem" } as React.CSSProperties}
      >
        <DashboardSidebar unreadNotifications={unreadNotifications} />
        <SidebarInset className="min-w-0 overflow-hidden rounded-md border border-black/5 bg-white">
          <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[#ececea] bg-white px-5 sm:px-6">
            <SidebarTrigger className="-ml-1 text-[#5c5c5c] hover:bg-[#f3f3f1] hover:text-[#1d1d1f]" />
            <span className="text-sm text-[#d4d4d4] select-none">|</span>
            <DashboardBreadcrumb />
          </header>
          <div className="w-full flex-1 p-5 sm:p-7 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
