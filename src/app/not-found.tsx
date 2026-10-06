import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Suspense } from "react";

import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeaderServer } from "@/components/store/store-header-server";
import { Button } from "@/components/ui/button";
import { fetchUserProfile } from "@/lib/data/dashboard-user";
import { createClient } from "@/lib/supabase/legacy/server";
import type { Tables } from "@/types/legacy-supabase";

// /_not-found diprerender statis; header (data server) dibungkus Suspense.
function StoreHeaderFallback() {
  return <div className="h-16 w-full border-b border-border md:h-[7.25rem]" aria-hidden="true" />;
}

async function fetchLayoutData(): Promise<{
  user: User | null;
  profile: Tables<"profiles"> | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = user ? await fetchUserProfile(user.id).catch(() => null) : null;
    return { user, profile };
  } catch {
    return { user: null, profile: null };
  }
}

export default async function NotFound() {
  const { user, profile } = await fetchLayoutData();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InitAuthStore user={user} profile={profile} />
      <AnnouncementBarServer />
      <Suspense fallback={<StoreHeaderFallback />}>
        <StoreHeaderServer />
      </Suspense>
      <main className="flex-1">
        <section className="nzo-container py-20 md:py-32">
          <p className="text-display text-steel-200 tabular-nums" aria-hidden="true">
            404
          </p>
          <h1 className="mt-4 max-w-xl">Halaman ini tidak ditemukan.</h1>
          <p className="mt-3 max-w-prose text-muted-foreground">
            Alamatnya mungkin salah ketik, atau halamannya sudah dipindah. Cari part yang kamu
            butuhkan dari katalog.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/products">Lihat semua part</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Ke beranda</Link>
            </Button>
          </div>
        </section>
      </main>
      <StoreFooter />
    </div>
  );
}
