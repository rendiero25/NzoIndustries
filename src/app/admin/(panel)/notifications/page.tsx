import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/legacy/server";
import { AdminNotificationsPanel } from "@/components/admin/admin-notifications-panel";

export const metadata: Metadata = {
  title: "Notifikasi Admin",
};

async function fetchAdminNotifications(limit = 80) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("admin_notifications")
    .select("id, title, body, type, is_read, created_at, data")
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));
  return data ?? [];
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [{ data: profile }, items] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    fetchAdminNotifications(80),
  ]);
  if (profile?.role !== "admin") redirect("/admin/login");

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">Admin</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Notifikasi</h1>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Belum ada notifikasi.</p>
      ) : (
        <div className="mt-10">
          <AdminNotificationsPanel items={items} />
        </div>
      )}
    </div>
  );
}
