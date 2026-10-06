export const dynamic = "force-dynamic";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/legacy/server";
import { requireUser } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { fetchUserProfile } from "@/lib/data/dashboard-user";
import { StoreHeaderServer } from "@/components/store/store-header-server";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";

async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Proteksi di server (bukan hanya proxy).
  await requireUser("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const sidebarDefaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const [unreadNotifications, profile] = await Promise.all([
    user ? getUnreadNotificationsCount(user.id) : Promise.resolve(0),
    user ? fetchUserProfile(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <InitAuthStore user={user} profile={profile} />
      <StoreHeaderServer showCategoryNav={false} showBorder={false} />
      <DashboardShell
        unreadNotifications={unreadNotifications}
        sidebarDefaultOpen={sidebarDefaultOpen}
      >
        {children}
      </DashboardShell>
      <StoreFooter />
      <WhatsAppButton className="bottom-[max(1rem,env(safe-area-inset-bottom,0px))]" />
    </div>
  );
}
