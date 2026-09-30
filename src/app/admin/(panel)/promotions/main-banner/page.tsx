import type { Metadata } from "next";

import { listBanners } from "./_actions";
import { MainBannerForm } from "./_components/main-banner-form";
import { MainBannerTable } from "./_components/main-banner-table";

export const metadata: Metadata = {
  title: "Main Banner — Promosi Admin NZO Industries",
};
export const dynamic = "force-dynamic";

export default async function MainBannerPage() {
  const banners = await listBanners();

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Main Banner</h1>
        <p className="text-[17px] leading-[1.47] text-foreground">
          Hero banner utama yang ditampilkan di bagian atas halaman beranda.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="admin-section-title text-foreground">Daftar Banner</h2>
        <MainBannerTable banners={banners} />
      </div>

      <div className="space-y-3">
        <h2 className="admin-section-title text-foreground">Tambah Banner Baru</h2>
        <MainBannerForm />
      </div>
    </div>
  );
}
