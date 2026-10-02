"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { ShieldMark } from "@/components/catalog/shield-mark";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SiteLogo } from "@/components/shared/site-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
};

type NavItem = {
  label: string;
  href: string;
  match: (path: string, category: string | null) => boolean;
};

/** Navigasi utama design-system.md §5. Slug kategori sesuai seed (motor, mobil). */
const NAV_ITEMS: NavItem[] = [
  { label: "Semua part", href: "/products", match: (p, c) => p === "/products" && !c },
  {
    label: "Motor",
    href: "/products?category=motor",
    match: (p, c) => p === "/products" && c === "motor",
  },
  {
    label: "Mobil",
    href: "/products?category=mobil",
    match: (p, c) => p === "/products" && c === "mobil",
  },
  { label: "Brand", href: "/brands", match: (p) => p.startsWith("/brands") },
  {
    label: "Perawatan & alat",
    href: "/products?category=non-otomotif",
    match: (p, c) => p === "/products" && c === "non-otomotif",
  },
];

type StoreHeaderProps = {
  /** @deprecated warisan starter, tidak dipakai lagi. */
  secondHandPromoId?: string | null;
  initialCartCount?: number;
  /** Matikan bila header dibungkus elemen sticky di parent. */
  sticky?: boolean;
  showCategoryNav?: boolean;
  showBorder?: boolean;
  className?: string;
};

function initialsOf(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

/**
 * Header storefront NZO (design-system.md §5): logo, pencarian, Garasi,
 * wishlist, akun, keranjang; baris navigasi di bawahnya. Mobile: menu Sheet.
 * Saat scroll, header menempel dengan bayangan tipis (tanpa mengubah tinggi,
 * supaya konten tidak melompat).
 */
export function StoreHeader({
  initialCartCount = 0,
  sticky = true,
  showCategoryNav = true,
  showBorder = true,
  className,
}: StoreHeaderProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const category = pathname === "/products" ? searchParams.get("category") : null;

  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const resetAuth = useAuthStore((s) => s.reset);
  const cartCount = useCartStore((s) => s.cartCount);
  const setCartCount = useCartStore((s) => s.setCartCount);

  useEffect(() => {
    setCartCount(initialCartCount);
  }, [initialCartCount, setCartCount]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { results?: SearchResult[] };
      setResults(data.results ?? []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(value), 300);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowResults(false);
    setMenuOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function clearSearch() {
    setShowResults(false);
    setQuery("");
    setResults([]);
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      resetAuth();
      toast.success("Kamu sudah keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      setLoggingOut(false);
      window.location.href = "/";
    }
  }

  const searchForm = (id: string, className?: string) => (
    <form onSubmit={submitSearch} className={cn("relative min-w-0", className)} role="search">
      <label htmlFor={id} className="sr-only">
        Cari part atau aksesoris
      </label>
      <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-steel-50 px-3 transition-colors focus-within:border-foreground focus-within:bg-background">
        <Search className="size-4 shrink-0 text-steel-500" strokeWidth={1.75} aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setShowResults(false)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Cari kampas rem, oli, lampu…"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-steel-500"
        />
        {searching ? <Spinner className="size-4 text-steel-500" /> : null}
      </div>
      {showResults && results.length > 0 ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-[0_16px_40px_-16px_rgb(0_0_0/0.3)]">
          <ul>
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/products/${r.slug}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={clearSearch}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-muted"
                >
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatIDR(r.sale_price ?? r.base_price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearSearch}
            className="block border-t border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Lihat semua hasil untuk &ldquo;{query.trim()}&rdquo;
          </Link>
        </div>
      ) : null}
    </form>
  );

  const accountLinks = [
    { href: "/dashboard", label: "Ringkasan akun", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "Pesanan", icon: Package },
    { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
    { href: "/dashboard/profile", label: "Profil", icon: User },
  ];

  return (
    <>
      <header
        className={cn(
          "z-40 w-full bg-background",
          sticky && "sticky top-0",
          showBorder && "border-b border-border",
          scrolled && "shadow-[0_1px_0_0_var(--border),0_8px_24px_-20px_rgb(0_0_0/0.35)]",
          className,
        )}
      >
        <div className="nzo-container">
          <div className="flex h-16 items-center gap-3 md:h-[4.5rem] md:gap-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(true)}
              className="-ml-2 md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="size-5" strokeWidth={1.75} />
            </Button>

            <SiteLogo variant="navbar" priority />

            {searchForm("store-search", "hidden flex-1 md:block md:max-w-xl")}

            {/* Signature: konteks kendaraan aktif (pemilih kendaraan dibangun Fase 4) */}
            <Link
              href="/#pilih-kendaraan"
              className="group hidden h-11 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm transition-colors hover:border-foreground lg:flex"
            >
              <ShieldMark checked={false} className="size-4 text-foreground" />
              <span className="flex flex-col leading-tight">
                <span className="text-caption text-muted-foreground">Garasi</span>
                <span className="font-medium">Pilih kendaraan</span>
              </span>
            </Link>

            <div className="ml-auto flex shrink-0 items-center gap-0.5 md:gap-1">
              <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Cari">
                <Link href="/search">
                  <Search className="size-5" strokeWidth={1.75} />
                </Link>
              </Button>

              {isAuthenticated ? (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex"
                    aria-label="Wishlist"
                  >
                    <Link href="/dashboard/wishlist">
                      <Heart className="size-5" strokeWidth={1.75} />
                    </Link>
                  </Button>
                  <span className="hidden md:inline-flex">
                    <NotificationBell />
                  </span>
                </>
              ) : null}

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`Keranjang, ${cartCount} barang`}
              >
                <Link href="/cart">
                  <ShoppingBag className="size-5" strokeWidth={1.75} />
                  {cartCount > 0 ? (
                    <span className="absolute top-1 right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-signal px-1 text-[0.6875rem] leading-none font-bold text-brand-black tabular-nums">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  ) : null}
                </Link>
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="hidden h-11 gap-2 px-2 md:inline-flex"
                      aria-label="Menu akun"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground">
                        {initialsOf(profile?.full_name, user?.email)}
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.75} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-60">
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                      <span className="truncate font-semibold">
                        {profile?.full_name ?? "Akun saya"}
                      </span>
                      <span className="truncate text-caption font-normal text-muted-foreground">
                        {user?.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {accountLinks.map(({ href, label, icon: Icon }) => (
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href}>
                          <Icon className="size-4" strokeWidth={1.75} />
                          {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    {isAdmin ? (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Settings className="size-4" strokeWidth={1.75} />
                          Panel admin
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={loggingOut}
                      onSelect={() => void logout()}
                    >
                      <LogOut className="size-4" strokeWidth={1.75} />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden items-center gap-2 pl-2 md:flex">
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login">Masuk</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/register">Daftar</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showCategoryNav ? (
            <nav aria-label="Navigasi utama" className="-mx-4 hidden md:-mx-6 md:block lg:-mx-8">
              <ul className="scrollbar-none flex gap-1 overflow-x-auto px-2 md:px-4 lg:px-6">
                {NAV_ITEMS.map((item) => {
                  const active = item.match(pathname, category);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative inline-flex h-11 items-center px-3 text-sm whitespace-nowrap text-steel-700 transition-colors hover:text-foreground",
                          "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-200",
                          active && "font-semibold text-foreground after:scale-x-100",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(100%,22rem)] gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-left text-base">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
            {searchForm("store-search-mobile")}

            <Link
              href="/#pilih-kendaraan"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-md border border-border p-3"
            >
              <ShieldMark checked={false} className="size-5 text-foreground" />
              <span className="flex flex-col leading-tight">
                <span className="text-caption text-muted-foreground">Garasi</span>
                <span className="font-medium">Pilih kendaraan</span>
              </span>
            </Link>

            <nav aria-label="Navigasi utama">
              <ul className="flex flex-col">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex h-12 items-center border-b border-border text-[0.9375rem]",
                        item.match(pathname, category) && "font-semibold",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {isAuthenticated ? (
              <div className="flex flex-col gap-1">
                <p className="text-caption text-muted-foreground">Akun</p>
                {accountLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex h-11 items-center gap-3 text-[0.9375rem]"
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                    {label}
                  </Link>
                ))}
                {isAdmin ? (
                  <Link href="/admin" className="flex h-11 items-center gap-3 text-[0.9375rem]">
                    <Settings className="size-4" strokeWidth={1.75} />
                    Panel admin
                  </Link>
                ) : null}
                <Button
                  type="button"
                  variant="destructive-ghost"
                  loading={loggingOut}
                  onClick={() => void logout()}
                  className="mt-2 justify-start"
                >
                  <LogOut className="size-4" strokeWidth={1.75} />
                  Keluar
                </Button>
              </div>
            ) : (
              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button asChild variant="secondary">
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Daftar</Link>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
