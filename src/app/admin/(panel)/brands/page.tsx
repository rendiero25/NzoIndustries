import type { Metadata } from "next";

import { BrandManager } from "@/components/admin/catalog/brand-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getCloudinaryConfig } from "@/lib/cloudinary/server";
import { listAdminBrands } from "@/server/queries/admin/catalog";

export const metadata: Metadata = { title: "Brand" };
export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  await requireRole(["owner", "admin"]);
  const brands = await listAdminBrands();
  const config = getCloudinaryConfig();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Brand"
        description={`${brands.length} brand. Brand nonaktif tidak tampil di toko.`}
      />
      <BrandManager
        brands={brands}
        cloud={config ? { cloudName: config.cloudName, apiKey: config.apiKey } : null}
      />
    </div>
  );
}
