"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SiteLogo } from "@/components/shared/site-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { StaffRole } from "@/lib/auth/access";

import { navForRole, ROLE_LABEL } from "./admin-nav";

type AdminSidebarProps = {
  role: StaffRole;
  name: string | null;
  email: string | null;
};

/** Sidebar admin (design-system.md §6): tenang, collapsible, menu sesuai role. */
export function AdminSidebar({ role, name, email }: AdminSidebarProps) {
  const pathname = usePathname() ?? "/admin";
  const groups = navForRole(role);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-4 group-data-[collapsible=icon]:px-2">
        <span className="group-data-[collapsible=icon]:hidden">
          <SiteLogo
            href="/admin"
            variant="adminSidebar"
            ariaLabel="NZO Industries, ke dashboard admin"
          />
        </span>
        <Link
          href="/admin"
          aria-label="Dashboard admin"
          className="hidden size-8 items-center justify-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground group-data-[collapsible=icon]:flex"
        >
          N
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ label, href, icon: Icon, exact }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive(href, exact)} tooltip={label}>
                      <Link href={href}>
                        <Icon strokeWidth={1.75} />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-0.5 px-1">
          <span className="truncate text-sm font-medium">{name ?? email ?? "Staf"}</span>
          <span className="text-caption text-muted-foreground">{ROLE_LABEL[role]}</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
