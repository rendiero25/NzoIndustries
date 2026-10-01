import { createClient } from "@/lib/supabase/legacy/server";
import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MaintenancePage } from "@/components/layout/maintenance-page";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import {
  fetchStoreHeaderCartCount,
  fetchStoreHeaderSecondHandPromoId,
} from "@/lib/data/store-header-server";
import { fetchUserProfile } from "@/lib/data/dashboard-user";

async function getMaintenanceMode(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();
    return data?.value === true || data?.value === "true";
  } catch {
    return false;
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [isMaintenance, secondHandPromoId, initialCartCount, profile] = await Promise.all([
    getMaintenanceMode(),
    fetchStoreHeaderSecondHandPromoId().catch(() => null),
    fetchStoreHeaderCartCount().catch(() => 0),
    user ? fetchUserProfile(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <InitAuthStore user={user} profile={profile} />
      <AnnouncementBarServer />
      <StoreHeader secondHandPromoId={secondHandPromoId} initialCartCount={initialCartCount} />
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>
      <StoreFooter />
      <BottomNavBar />
      <WhatsAppButton />
    </div>
  );
}
