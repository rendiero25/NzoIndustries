"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Menu, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/admin$/, title: "Dashboard" },
  { pattern: /^\/admin\/products\/new$/, title: "Tambah Produk" },
  { pattern: /^\/admin\/products\/[^/]+\/edit$/, title: "Edit Produk" },
  { pattern: /^\/admin\/products/, title: "Kelola Produk" },
  { pattern: /^\/admin\/brands\/new$/, title: "Tambah Merek" },
  { pattern: /^\/admin\/brands\/[^/]+\/edit$/, title: "Edit Merek" },
  { pattern: /^\/admin\/brands/, title: "Kelola Merek" },
  { pattern: /^\/admin\/categories/, title: "Kelola Kategori" },
  { pattern: /^\/admin\/orders\/[^/]+$/, title: "Detail Pesanan" },
  { pattern: /^\/admin\/orders/, title: "Kelola Pesanan" },
  { pattern: /^\/admin\/customers\/[^/]+$/, title: "Detail Pelanggan" },
  { pattern: /^\/admin\/customers/, title: "Kelola Pelanggan" },
  { pattern: /^\/admin\/reviews/, title: "Ulasan" },
  { pattern: /^\/admin\/complaints/, title: "Komplain" },
  { pattern: /^\/admin\/banners/, title: "Banner" },
  { pattern: /^\/admin\/flash-sale/, title: "Flash Sale" },
  { pattern: /^\/admin\/settings/, title: "Pengaturan" },
];

function getPageTitle(pathname: string): string {
  for (const { pattern, title } of PAGE_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return "Admin Panel";
}

type AdminTopbarProps = {
  onMenuClick: () => void;
};

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { reset } = useAuthStore();

  const pageTitle = getPageTitle(pathname);

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

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "A");

  return (
    <header className="admin-topbar-surface sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="transition-swiss -ml-1 p-2 text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Buka menu navigasi"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground uppercase sm:text-[21px]">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-text-link hidden h-11 items-center gap-2 rounded-md border border-transparent px-4 sm:flex"
          aria-label="Buka website"
        >
          <ExternalLink size={13} />
          <span className="hidden text-sm font-medium lg:inline">Ke Web NZO Industries</span>
        </Link>

        <AdminNotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-1 h-11 gap-1.5 px-3 hover:bg-muted/60"
              aria-label="Menu akun"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-black text-foreground">
                {initials}
              </div>
              <div className="hidden max-w-[8rem] min-w-0 text-left lg:block">
                <p className="truncate text-xs leading-none font-semibold">
                  {profile?.full_name ?? "Admin"}
                </p>
                <p className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <ChevronDown size={12} className="hidden shrink-0 text-muted-foreground lg:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Admin"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings/account" className="flex items-center gap-2">
                <User size={14} />
                Profil Saya
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="flex items-center gap-2">
                <Settings size={14} />
                Pengaturan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink size={14} />
                Lihat Website
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void handleLogout()}
              className="gap-2"
            >
              <LogOut size={14} />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
