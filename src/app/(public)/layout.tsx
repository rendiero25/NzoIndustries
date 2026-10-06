import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeaderServer } from "@/components/store/store-header-server";
import { fetchUserProfile } from "@/lib/data/dashboard-user";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Profil untuk auth store legacy (dashboard lama) sampai Fase 7.
  const profile = user ? await fetchUserProfile(user.id).catch(() => null) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InitAuthStore user={user} profile={profile} />
      <AnnouncementBarServer />
      <StoreHeaderServer />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <WhatsAppButton />
    </div>
  );
}
