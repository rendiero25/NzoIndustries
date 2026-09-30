"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Umum", href: "/admin/settings" },
  { label: "Pengiriman", href: "/admin/settings/shipping" },
  { label: "Pembayaran", href: "/admin/settings/payment" },
  { label: "Kurir", href: "/admin/settings/couriers" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin/settings") {
      return pathname === "/admin/settings";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-wrap gap-0 border-b border-[#e0e0e0]">
      {TABS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex h-11 items-center border-b-2 px-4 text-xs font-semibold uppercase transition-colors",
            isActive(href)
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
