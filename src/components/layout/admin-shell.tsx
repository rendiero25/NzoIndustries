"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import type { StaffRole } from "@/lib/auth/access";

import { SEGMENT_LABELS } from "./admin-nav";

function isIdSegment(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(s) || /^\d+$/.test(s) || /^NZO-/.test(s);
}

function AdminBreadcrumb() {
  const pathname = usePathname() ?? "/admin";
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

  const trail = relevant.slice(1);
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:flex">
          <BreadcrumbLink asChild>
            <Link href="/admin">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((seg, i) => {
          const isLast = i === trail.length - 1;
          const label = SEGMENT_LABELS[seg] ?? seg;
          const href = "/" + segments.slice(0, segments.lastIndexOf(seg) + 1).join("/");
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

const THEME_KEY = "nzo-admin-theme";
const themeListeners = new Set<() => void>();

function readDark(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}

/**
 * Dark mode khusus dashboard admin (design-system.md §2). Kelas `dark` dipasang
 * di <html> selama di panel admin (agar dropdown/dialog di portal ikut gelap)
 * dan dilepas saat keluar, sehingga storefront selalu light.
 */
function useAdminDarkMode() {
  const dark = React.useSyncExternalStore(
    (cb) => {
      themeListeners.add(cb);
      return () => themeListeners.delete(cb);
    },
    readDark,
    () => false,
  );

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    return () => root.classList.remove("dark");
  }, [dark]);

  const toggle = React.useCallback(() => {
    try {
      localStorage.setItem(THEME_KEY, readDark() ? "light" : "dark");
    } catch {
      // storage diblokir: abaikan
    }
    themeListeners.forEach((l) => l());
  }, []);

  return { dark, toggle };
}

type AdminShellProps = {
  children: React.ReactNode;
  sidebarDefaultOpen?: boolean;
  role: StaffRole;
  name: string | null;
  email: string | null;
};

export function AdminShell({
  children,
  sidebarDefaultOpen = true,
  role,
  name,
  email,
}: AdminShellProps) {
  const { dark, toggle } = useAdminDarkMode();
  const [signingOut, setSigningOut] = React.useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
      setSigningOut(false);
      return;
    }
    window.location.href = "/admin/login";
  }

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <AdminSidebar role={role} name={name} email={email} />
      {/* min-w-0: tabel lebar menggulung di wadahnya sendiri, bukan melebarkan halaman */}
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <AdminBreadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink strokeWidth={1.75} />
                Lihat toko
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={toggle}
              aria-label={dark ? "Pakai tema terang" : "Pakai tema gelap"}
              aria-pressed={dark}
            >
              {dark ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={signingOut}
              onClick={() => void signOut()}
            >
              <LogOut strokeWidth={1.75} />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 pb-12 md:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
