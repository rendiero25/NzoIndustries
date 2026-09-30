"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HEADER_DROPDOWN_MENU_CONTENT_CLASS,
  HEADER_DROPDOWN_MENU_ITEM_CLASS,
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { SiteLogo } from "@/components/shared/site-logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Produk", href: "/products" },
  { label: "Kategori", href: "/products?view=category" },
  { label: "Flash Sale", href: "/flash-sale" },
  { label: "Blog", href: "/blog" },
] as const;

// ----------------------------------------------------------------
// Navbar utama
// ----------------------------------------------------------------
export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const { reset } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarImgError, setAvatarImgError] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tutup mobile menu saat route berubah
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Focus search input saat dibuka
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Lock scroll saat mobile menu terbuka
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      window.location.href = "/";
    }
  };

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  const avatarUrl =
    profile?.avatar_url?.trim() ||
    (user?.user_metadata?.picture as string | undefined)?.trim() ||
    (user?.user_metadata?.avatar_url as string | undefined)?.trim() ||
    "";

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-3">
            {/* Mobile: hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="transition-swiss -ml-1 p-2 text-muted-foreground hover:text-foreground lg:hidden"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <SiteLogo variant="navbar" priority />

            {/* Desktop nav links */}
            <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "transition-swiss px-3 py-1.5 text-sm font-medium",
                    pathname === href || pathname.startsWith(href.split("?")[0])
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex-1" />

            {/* Desktop search bar */}
            {searchOpen ? (
              <form
                onSubmit={handleSearch}
                className="transition-swiss hidden w-64 items-center border border-foreground/30 focus-within:border-foreground lg:flex"
              >
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari produk..."
                  className="h-8 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="transition-swiss px-2 text-muted-foreground hover:text-foreground"
                  aria-label="Tutup pencarian"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="transition-swiss hidden h-8 w-52 items-center gap-2 border border-border px-3 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground lg:flex"
                aria-label="Cari produk"
              >
                <Search size={14} />
                <span>Cari produk...</span>
              </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="transition-swiss p-2 text-muted-foreground hover:text-foreground lg:hidden"
                aria-label="Cari"
              >
                <Search size={18} />
              </button>

              {/* Notif bell (hanya saat login) */}
              {isAuthenticated && <NotificationBell />}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors outline-none hover:bg-black/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#FF7A52] focus-visible:ring-offset-2"
                aria-label="Keranjang belanja"
              >
                <ShoppingCart size={18} />
              </Link>

              {/* User menu / Auth buttons */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-1 h-8 gap-1.5 px-2"
                      aria-label="Menu akun"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden bg-foreground text-[10px] font-black text-background">
                        {avatarUrl && !avatarImgError ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarImgError(true)}
                          />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className={cn("w-[min(100vw-2rem,14rem)]", HEADER_DROPDOWN_MENU_CONTENT_CLASS)}
                  >
                    <HeaderDropdownPanelHeader title={profile?.full_name ?? "Pengguna"} />
                    <HeaderDropdownPanelBody className="py-1">
                      <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                        <Link href="/dashboard/profile" className="flex items-center gap-2">
                          <User size={14} />
                          Profil Saya
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                        <Link href="/dashboard/orders" className="flex items-center gap-2">
                          <Package size={14} />
                          Pesanan Saya
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin ? (
                        <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                          <Link href="/admin" className="flex items-center gap-2">
                            <Settings size={14} />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void handleLogout()}
                        className={cn(
                          HEADER_DROPDOWN_MENU_ITEM_CLASS,
                          "border-t border-[#e0e0e0] text-destructive focus:bg-destructive/10 focus:text-destructive",
                        )}
                      >
                        <LogOut size={14} />
                        Keluar
                      </DropdownMenuItem>
                    </HeaderDropdownPanelBody>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="ml-1 hidden items-center gap-1 sm:flex">
                  <Link href="/login">
                    <Button variant="pearl" size="sm" className="text-xs font-bold uppercase">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="dark" size="sm" className="text-xs font-bold uppercase">
                      Daftar
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar (collapsible) */}
        {searchOpen && (
          <div className="border-t border-border px-4 py-2 lg:hidden">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk..."
                className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />

          {/* Drawer */}
          <aside className="fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background lg:hidden">
            {/* Header drawer */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="text-base font-black uppercase">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="-mr-2 p-2 text-muted-foreground hover:text-foreground"
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-0.5 px-3">
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "transition-swiss flex h-10 items-center px-3 text-sm font-medium",
                        pathname === href || pathname.startsWith(href.split("?")[0])
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mx-3 my-4 border-t border-border" />

              {/* Auth section */}
              {isAuthenticated ? (
                <div className="space-y-0.5 px-3">
                  <div className="mb-2 px-3 py-2">
                    <p className="text-sm font-semibold">{profile?.full_name ?? "Pengguna"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <MobileMenuItem icon={User} label="Profil Saya" href="/dashboard/profile" />
                  <MobileMenuItem icon={Package} label="Pesanan Saya" href="/dashboard/orders" />
                  {isAdmin && <MobileMenuItem icon={Settings} label="Admin Panel" href="/admin" />}
                  <button
                    onClick={handleLogout}
                    className="transition-swiss flex h-10 w-full items-center gap-3 px-3 text-sm font-medium text-destructive hover:bg-destructive/5"
                  >
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              ) : (
                <div className="space-y-2 px-3">
                  <Link href="/login" className="block">
                    <Button variant="pearl" className="w-full text-xs font-bold uppercase">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register" className="block">
                    <Button variant="primary" className="w-full text-xs font-bold uppercase">
                      Daftar
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------
function MobileMenuItem({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="transition-swiss flex h-10 items-center gap-3 px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}
