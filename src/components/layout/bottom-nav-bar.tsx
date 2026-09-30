"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Home, ShoppingCart, User } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Produk", icon: Grid2X2 },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/dashboard", label: "Akun", icon: User, authHref: "/login" },
] as const;

export function BottomNavBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="Navigasi bawah"
    >
      <ul className="grid h-16 min-h-16 grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const resolvedHref = "authHref" in rest && !isAuthenticated ? rest.authHref : href;
          const active = isActive(href);

          return (
            <li key={href}>
              <Link
                href={resolvedHref}
                className={cn(
                  "ease-spring flex h-full flex-col items-center justify-center gap-1 transition-[transform,color] duration-[160ms] motion-safe:active:scale-95 motion-safe:active:duration-[50ms]",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? "text-brand" : ""}
                />
                <span className={cn("text-[10px] font-bold uppercase", active && "text-brand")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
