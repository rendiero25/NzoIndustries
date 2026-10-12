"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getUnreadNotificationCount } from "@/server/actions/account/notifications";

/**
 * Lonceng header: jumlah notifikasi belum dibaca (tabel `notifications`),
 * ke `/account/notifications`. Dimuat ulang saat pindah halaman.
 */
export function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getUnreadNotificationCount().then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"}
    >
      <Link href="/account/notifications">
        <Bell className="size-5" strokeWidth={1.75} />
        {count > 0 ? (
          <span className="absolute top-1 right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-signal px-1 text-[0.6875rem] leading-none font-bold text-brand-black tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
