import { Package } from "lucide-react";
import Link from "next/link";

import { OrderCard } from "@/components/account/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ORDER_TABS } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { listMyOrders, ORDERS_PER_PAGE } from "@/server/queries/account";

export const metadata = { title: "Pesanan" };

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { tab, page, total, orders } = await listMyOrders({
    tab: sp.tab,
    page: Number(sp.page) || 1,
  });
  const pages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  const href = (p: number) => `/account/orders?tab=${tab}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pesanan" className="pb-0" />

      <nav aria-label="Filter status" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 border-b border-border">
          {ORDER_TABS.map((t) => (
            <li key={t.key} className="shrink-0">
              <Link
                href={`/account/orders?tab=${t.key}`}
                aria-current={t.key === tab ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center border-b-2 px-3 text-sm whitespace-nowrap",
                  t.key === tab
                    ? "border-primary font-semibold text-foreground"
                    : "border-transparent text-steel-700 hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Belum ada pesanan di sini"
          description="Pesanan dengan status ini akan muncul di sini."
          action={{ label: "Belanja sekarang", href: "/products" }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <OrderCard key={o.orderNumber} order={o} />
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3 text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)}>Sebelumnya</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            Halaman {page} dari {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
