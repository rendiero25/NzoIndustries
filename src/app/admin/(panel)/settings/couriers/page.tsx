import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { SettingsNav } from "../_components/settings-nav";
import { CourierBrandForm } from "./_components/courier-brand-form";

export const metadata: Metadata = { title: "Kurir — Admin NZO Industries" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsCouriersPage() {
  const supabase = await createServiceClient();

  const { data: row } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "active_courier_codes")
    .single();

  const activeCodes: string[] = Array.isArray(row?.value)
    ? (row.value as string[]).filter((v) => typeof v === "string")
    : [];

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Toko</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Kurir</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Pilih kurir yang tersedia untuk pelanggan saat checkout.
        </p>
      </div>

      <SettingsNav />

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-[#e0e0e0] px-5 py-4">
          <h2 className="admin-section-title">Kurir Aktif</h2>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            Centang kurir yang ingin ditampilkan di halaman checkout. Hanya layanan yang tersedia
            untuk rute pelanggan yang akan muncul.
          </p>
        </div>
        <div className="p-6">
          <CourierBrandForm activeCodes={activeCodes} />
        </div>
      </div>
    </div>
  );
}
