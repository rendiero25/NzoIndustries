import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Suspense } from "react";

import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { Button } from "@/components/ui/button";
import { fetchUserProfile } from "@/lib/data/dashboard-user";
import {
  fetchStoreHeaderCartCount,
  fetchStoreHeaderSecondHandPromoId,
} from "@/lib/data/store-header-server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

// StoreHeader pakai useSearchParams() — halaman /_not-found selalu di-prerender
// statis oleh Next.js, jadi wajib dibungkus Suspense agar build tidak gagal.
function StoreHeaderFallback() {
  return (
    <header className="w-full border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
        <div className="flex items-center gap-3 py-3 md:py-4">
          <div className="h-8 w-[9.5rem] shrink-0 rounded bg-[#f5f5f7] sm:h-9 sm:w-[11.5rem]" />
          <div className="mx-auto hidden h-11 max-w-2xl flex-1 rounded-md bg-[#f5f5f7] sm:block" />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#f5f5f7]" />
            <div className="h-8 w-8 rounded-full bg-[#f5f5f7]" />
          </div>
        </div>
      </div>
    </header>
  );
}

async function fetchLayoutData(): Promise<{
  user: User | null;
  profile: Tables<"profiles"> | null;
  secondHandPromoId: string | null;
  initialCartCount: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [secondHandPromoId, initialCartCount, profile] = await Promise.all([
      fetchStoreHeaderSecondHandPromoId().catch(() => null),
      fetchStoreHeaderCartCount().catch(() => 0),
      user ? fetchUserProfile(user.id).catch(() => null) : Promise.resolve(null),
    ]);

    return { user, profile, secondHandPromoId, initialCartCount };
  } catch {
    return { user: null, profile: null, secondHandPromoId: null, initialCartCount: 0 };
  }
}

export default async function NotFound() {
  const { user, profile, secondHandPromoId, initialCartCount } = await fetchLayoutData();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <InitAuthStore user={user} profile={profile} />
      <AnnouncementBarServer />
      <Suspense fallback={<StoreHeaderFallback />}>
        <StoreHeader secondHandPromoId={secondHandPromoId} initialCartCount={initialCartCount} />
      </Suspense>
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <section className="flex min-h-[70vh] w-full items-center justify-center bg-white px-6 py-20">
          <div className="flex max-w-[560px] flex-col items-center text-center">
            {/* Signature: ghost product card — an empty shelf in the store's own language */}
            <div
              className="mb-10 w-[190px] overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white p-4"
              style={{ boxShadow: "rgba(0,0,0,0.22) 3px 5px 30px 0" }}
              aria-hidden="true"
            >
              <div className="mb-3 aspect-[4/3] w-full rounded-[8px] bg-[#f5f5f7]" />
              <div className="mb-2 h-3.5 w-4/5 rounded-full bg-[#f5f5f7]" />
              <div className="mb-3 h-3.5 w-3/5 rounded-full bg-[#f5f5f7]" />
              <div className="h-8 w-full rounded-full bg-[#f5f5f7]" />
            </div>

            <p className="mb-3 text-[14px] leading-[1.29] font-semibold tracking-[-0.224px] text-[#EA5329]">
              Halaman Tidak Ditemukan
            </p>

            <h1 className="mb-4 text-[28px] leading-[1.07] font-semibold tracking-[-0.28px] text-[#1d1d1f] sm:text-[40px]">
              Sepertinya halaman ini belum ada.
            </h1>

            <p className="mb-8 max-w-[440px] text-[17px] leading-[1.47] font-normal tracking-[-0.374px] text-[#7a7a7a]">
              URL yang kamu masukkan tidak ditemukan, atau halaman ini sedang dalam persiapan.
              Jelajahi produk kami atau kembali ke beranda.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="primary">
                <Link href="/">Ke Beranda</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/products">Lihat Produk</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <StoreFooter />
      <BottomNavBar />
    </div>
  );
}
