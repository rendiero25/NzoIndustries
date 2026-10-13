import type { Metadata } from "next";

import { BannerManager } from "@/components/admin/promo/banner-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getCloudinaryConfig } from "@/lib/cloudinary/server";
import { listAdminBanners } from "@/server/queries/admin/promo";

export const metadata: Metadata = { title: "Banner" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireRole(["owner", "admin"]);
  const banners = await listAdminBanners();
  const config = getCloudinaryConfig();
  // eslint-disable-next-line react-hooks/purity -- status jadwal dihitung per request
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Banner & bar promo"
        description="Banner tanpa data tidak dirender di toko. Urutan teratas tampil lebih dulu."
      />
      <BannerManager
        banners={banners}
        cloud={config ? { cloudName: config.cloudName, apiKey: config.apiKey } : null}
        now={now}
      />
    </div>
  );
}
