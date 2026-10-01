import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchUserNotifications } from "@/lib/data/dashboard-user";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/notifications");

  const items = await fetchUserNotifications(user.id, 10);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-[#7a7a7a] uppercase">Kotak masuk</p>
      <h1 className="mt-2 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">Notifikasi</h1>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">Belum ada notifikasi.</p>
      ) : (
        <div className="mt-10">
          <NotificationsPanel items={items} />
        </div>
      )}
    </div>
  );
}
