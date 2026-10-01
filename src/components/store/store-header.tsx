"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HEADER_DROPDOWN_MENU_CONTENT_CLASS,
  HEADER_DROPDOWN_MENU_ITEM_CLASS,
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/legacy-supabase";

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  image: string | null;
};

type StoreHeaderNavItem = { label: string; href: string };

/** Nav tetap di bawah header — bukan daftar kategori DB, tapi jalur belanja pilihan. */
function buildStoreHeaderNavItems(secondHandPromoId: string | null): StoreHeaderNavItem[] {
  const items: StoreHeaderNavItem[] = [
    { label: "Smartwatch", href: "/products?category=smartwatch" },
    { label: "Headset", href: "/products?category=headphone,earphone" },
    { label: "Speaker", href: "/products?category=speaker" },
    { label: "Shop by Brand", href: "/brands" },
  ];
  if (secondHandPromoId) {
    items.push({ label: "Second Hand", href: `/promo/${secondHandPromoId}` });
  }
  items.push({ label: "Others", href: "/products" });
  return items;
}

function isStoreHeaderNavItemActive(
  href: string,
  pathname: string,
  categoryParam: string | null,
): boolean {
  const [hrefPath, hrefQuery] = href.split("?");
  if (hrefQuery) {
    const category = new URLSearchParams(hrefQuery).get("category");
    return pathname === hrefPath && category !== null && category === categoryParam;
  }
  if (hrefPath === "/products") {
    return pathname === hrefPath && categoryParam === null;
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

/** URL avatar: profil DB dulu, lalu metadata OAuth (picture). */
function resolveStoreHeaderAvatarUrl(
  profile: Tables<"profiles"> | null,
  user: SupabaseUser | null,
): string {
  const fromProfile = profile?.avatar_url?.trim();
  if (fromProfile) return fromProfile;
  const meta = user?.user_metadata;
  if (!meta || typeof meta !== "object") return "";
  const picture = meta.picture;
  if (typeof picture === "string" && picture.trim() !== "") return picture.trim();
  const metaAvatar = meta.avatar_url;
  if (typeof metaAvatar === "string" && metaAvatar.trim() !== "") return metaAvatar.trim();
  return "";
}

type StoreHeaderProps = {
  /** ID promosi "Produk Second" aktif — dipakai link "Second Hand" di nav. Item disembunyikan jika null. */
  secondHandPromoId?: string | null;
  initialCartCount?: number;
  /** Default true — matikan jika header dibungkus sticky di parent (mis. layout dashboard). */
  sticky?: boolean;
  showCategoryNav?: boolean;
  showBorder?: boolean;
  className?: string;
};

const searchInputClass =
  "h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0";

export function StoreHeader({
  secondHandPromoId = null,
  initialCartCount = 0,
  sticky = true,
  showCategoryNav = true,
  showBorder = true,
  className,
}: StoreHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = pathname === "/products" ? searchParams.get("category") : null;
  const isSecondHandPromoPage =
    Boolean(secondHandPromoId) && pathname === `/promo/${secondHandPromoId}`;
  const hideCategoryNav =
    !showCategoryNav ||
    (!isSecondHandPromoPage &&
      (pathname?.startsWith("/promo/") || pathname?.startsWith("/flash-sale/")));
  const navItems = buildStoreHeaderNavItems(secondHandPromoId);
  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const { reset } = useAuthStore();
  const cartCount = useCartStore((s) => s.cartCount);
  const setCartCount = useCartStore((s) => s.setCartCount);

  useEffect(() => {
    setCartCount(initialCartCount);
  }, [initialCartCount, setCartCount]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startTransition(() => {
      setMobileMenuOpen(false);
    });
  }, [pathname]);

  const fetchSearchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
      setShowDropdown(true);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => fetchSearchResults(value), 300);
    },
    [fetchSearchResults],
  );

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setShowDropdown(false);
  };

  const closeDropdown = () => setTimeout(() => setShowDropdown(false), 150);

  const searchDropdown =
    showDropdown && searchResults.length > 0 ? (
      <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
        {searchResults.map((r) => (
          <Link
            key={r.id}
            href={`/products/${r.slug}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowDropdown(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-neutral-50"
          >
            {r.image ? (
              <Image
                src={r.image}
                alt={r.name}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{r.name}</p>
              <p className="text-xs text-neutral-500">
                {r.sale_price
                  ? `Rp${r.sale_price.toLocaleString("id-ID")}`
                  : `Rp${r.base_price.toLocaleString("id-ID")}`}
              </p>
            </div>
          </Link>
        ))}
        <Link
          href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setShowDropdown(false);
            setSearchQuery("");
            setSearchResults([]);
          }}
          className="flex items-center justify-center border-t border-neutral-100 px-3 py-2 text-xs font-medium text-brand transition-colors hover:bg-neutral-50"
        >
          Lihat semua hasil untuk &ldquo;{searchQuery.trim()}&rdquo; →
        </Link>
      </div>
    ) : null;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      setIsLoggingOut(false);
      window.location.href = "/";
    }
  };

  const avatarUrl = resolveStoreHeaderAvatarUrl(profile, user);

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <>
      <header
        className={cn(
          "w-full bg-white",
          showBorder && "border-b border-neutral-200",
          sticky &&
            "sticky top-0 z-40 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90",
          className,
        )}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="flex items-center gap-3 py-3 md:py-4">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileMenuOpen(true)}
              className="shrink-0 text-neutral-600 md:hidden"
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </Button>

            <Link
              href="/"
              className="relative block h-8 w-[9.5rem] shrink-0 sm:h-9 sm:w-[11.5rem]"
              aria-label="NZO Industries — Beranda"
            >
              <Image
                src="/logo.svg"
                unoptimized
                alt="NZO Industries"
                fill
                className="object-contain object-left"
                sizes="184px"
                priority
              />
            </Link>

            <form
              onSubmit={handleSearchSubmit}
              className="relative mx-auto hidden max-w-2xl min-w-0 flex-1 sm:block"
            >
              <div className="flex w-full items-center rounded-md border border-neutral-200 bg-neutral-100 pr-3 pl-4">
                <Search size={14} className="mr-2 shrink-0 text-neutral-400" aria-hidden />
                <Input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  onBlur={closeDropdown}
                  placeholder="Cari produk..."
                  className={searchInputClass}
                  aria-label="Cari produk"
                  aria-expanded={showDropdown}
                  aria-autocomplete="list"
                />
                {isSearching ? <Spinner className="size-3.5 shrink-0 text-neutral-400" /> : null}
              </div>
              {searchDropdown}
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    className="relative hidden sm:inline-flex"
                  >
                    <Link
                      href="/cart"
                      aria-label={`Keranjang${cartCount > 0 ? ` (${cartCount})` : ""}`}
                    >
                      <ShoppingCart size={20} />
                      {cartCount > 0 ? (
                        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-none font-bold text-white">
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      ) : null}
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Keranjang</TooltipContent>
              </Tooltip>
              {isAuthenticated ? <NotificationBell /> : null}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 px-2"
                      aria-label="Menu akun"
                    >
                      <Avatar className="h-8 w-8 after:border-0">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : null}
                        <AvatarFallback className="bg-[#1d1d1f] text-[10px] font-black text-white">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
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
                        <Link href="/dashboard" className="flex items-center gap-2">
                          <LayoutDashboard size={14} />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                        <Link href="/dashboard/profile" className="flex items-center gap-2">
                          <User size={14} />
                          Profil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                        <Link href="/dashboard/orders" className="flex items-center gap-2">
                          <Package size={14} />
                          Pesanan
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin ? (
                        <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                          <Link href="/admin" className="flex items-center gap-2">
                            <Settings size={14} />
                            Admin
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void handleLogout()}
                        disabled={isLoggingOut}
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
                <div className="flex items-center gap-1">
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                    <Link href="/login">
                      <User size={16} strokeWidth={1.75} />
                      Masuk
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="primary"
                    size="sm"
                    className="text-xs font-bold uppercase"
                  >
                    <Link href="/register">Daftar</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative pb-3 sm:hidden">
            <div className="flex w-full items-center rounded-md border border-neutral-200 bg-neutral-100 pr-3 pl-3">
              <Search size={15} className="shrink-0 text-neutral-500" aria-hidden />
              <Input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                onBlur={closeDropdown}
                placeholder="Cari produk..."
                className="h-10 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
                aria-label="Cari produk"
              />
              {isSearching ? <Spinner className="size-3 shrink-0 text-neutral-400" /> : null}
            </div>
            {searchDropdown}
          </form>

          {hideCategoryNav ? null : (
            <nav
              aria-label="Kategori produk"
              className="scrollbar-none -mx-4 flex scroll-py-2 gap-4 overflow-x-auto px-4 py-3 text-sm font-medium text-black sm:-mx-6 sm:justify-center sm:px-6"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "-mb-[13px] shrink-0 border-b-2 border-transparent pb-[13px] whitespace-nowrap transition hover:text-brand",
                    isStoreHeaderNavItemActive(item.href, pathname ?? "", categoryParam) &&
                      "border-current font-bold",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(100%,20rem)] gap-0 p-0">
          <SheetHeader className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3">
            <SheetTitle className="text-sm font-black uppercase">Menu</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
            >
              <X size={18} />
            </Button>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase">
              Kategori
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Button
                    asChild
                    variant="ghost"
                    className="h-10 w-full justify-start px-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        isStoreHeaderNavItemActive(item.href, pathname ?? "", categoryParam) &&
                          "font-bold underline underline-offset-4",
                      )}
                    >
                      {item.label}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-neutral-100" />
            {!isAuthenticated ? (
              <div className="space-y-2 px-2">
                <Button asChild variant="pearl" className="w-full font-bold uppercase">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild variant="primary" className="w-full font-bold uppercase">
                  <Link href="/register">Daftar</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1 px-2">
                <Button asChild variant="ghost" className="w-full justify-start gap-2">
                  <Link href="/dashboard">
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start gap-2">
                  <Link href="/dashboard/profile">
                    <User size={16} />
                    Profil
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start gap-2">
                  <Link href="/dashboard/orders">
                    <Package size={16} />
                    Pesanan
                  </Link>
                </Button>
                {isAdmin ? (
                  <Button asChild variant="ghost" className="w-full justify-start gap-2">
                    <Link href="/admin">
                      <Settings size={16} />
                      Admin
                    </Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="destructive-ghost"
                  loading={isLoggingOut}
                  onClick={() => void handleLogout()}
                  className="w-full justify-start gap-2"
                >
                  <LogOut size={16} />
                  Keluar
                </Button>
              </div>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
