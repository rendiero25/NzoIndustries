import type { Metadata } from "next";

import { StaffNotificationsList } from "@/components/admin/system/notifications-list";
import { PageHeader } from "@/components/shared/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { listStaffNotifications } from "@/server/queries/admin/system";

export const metadata: Metadata = { title: "Notifikasi" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const user = await requireStaff();
  const items = await listStaffNotifications(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifikasi" description="Pemberitahuan untuk akun staf kamu." />
      <StaffNotificationsList items={items} />
    </div>
  );
}
