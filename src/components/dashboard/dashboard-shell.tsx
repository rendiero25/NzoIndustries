import type { ReactNode } from "react";

import { DashboardMobileNav, DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

type DashboardShellProps = {
  children: ReactNode;
  unreadNotifications?: number;
  /** @deprecated warisan sidebar shadcn; tidak dipakai lagi. */
  sidebarDefaultOpen?: boolean;
};

/**
 * Shell akun pelanggan (design-system.md §6): navigasi kiri di desktop,
 * tab geser di mobile, konten tanpa kartu pembungkus.
 */
export function DashboardShell({ children, unreadNotifications = 0 }: DashboardShellProps) {
  return (
    <div className="nzo-container py-6 md:py-10">
      <DashboardMobileNav unreadNotifications={unreadNotifications} />
      <div className="flex gap-10 pt-6 md:pt-0 lg:gap-14">
        <DashboardSidebar unreadNotifications={unreadNotifications} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
