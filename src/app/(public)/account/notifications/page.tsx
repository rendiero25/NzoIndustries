import Link from "next/link";

import { NotificationList } from "@/components/account/notification-list";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { listMyNotifications, NOTIFICATIONS_PER_PAGE } from "@/server/queries/account";

export const metadata = { title: "Notifikasi" };

export default async function AccountNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { total, items } = await listMyNotifications(page);
  const pages = Math.max(1, Math.ceil(total / NOTIFICATIONS_PER_PAGE));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifikasi" className="pb-0" />
      <NotificationList items={items} />
      {pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/account/notifications?page=${page - 1}`}>Sebelumnya</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            Halaman {page} dari {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/account/notifications?page=${page + 1}`}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
