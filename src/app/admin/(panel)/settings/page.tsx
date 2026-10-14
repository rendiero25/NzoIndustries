import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/system/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getServerEnv } from "@/lib/env";
import { getStoreSettings } from "@/server/queries/admin/system";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireRole(["owner", "admin"]);
  const settings = await getStoreSettings();
  const couriers = getServerEnv().BITESHIP_COURIERS.split(",").filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan toko"
        description="Info toko, pembayaran, pengirim, dan keamanan staf."
      />
      {settings ? (
        <SettingsForm settings={settings} canEdit={user.role === "owner"} couriers={couriers} />
      ) : (
        <p className="text-sm text-danger">Pengaturan toko belum ada di database.</p>
      )}
    </div>
  );
}
