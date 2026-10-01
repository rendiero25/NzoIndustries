import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/legacy/server";
import { SettingsNav } from "./_components/settings-nav";
import { MaintenanceToggle } from "./_components/maintenance-toggle";
import { AnnouncementForm } from "./_components/announcement-form";
import { WhatsappForm } from "./_components/whatsapp-form";
import { AutoCompleteForm } from "./_components/auto-complete-form";

export const metadata: Metadata = { title: "Pengaturan — Admin NZO Industries" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["maintenance_mode", "announcement_bar", "whatsapp_cs", "auto_complete_days"]);

  const get = (key: string): unknown => rows?.find((r: SettingRow) => r.key === key)?.value;

  const maintenanceMode = (get("maintenance_mode") as boolean) ?? false;
  const announcementBar = (get("announcement_bar") as { text: string; is_active: boolean }) ?? {
    text: "",
    is_active: false,
  };
  const whatsappCs = (get("whatsapp_cs") as string) ?? "";
  const autoCompleteDays = (get("auto_complete_days") as number) ?? 7;

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Toko</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Pengaturan</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Konfigurasi toko NZO Industries
        </p>
      </div>

      <SettingsNav />

      <div className="space-y-6">
        <div className="admin-utility-card overflow-hidden p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4">
            <h2 className="admin-section-title">Maintenance Mode</h2>
            <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
              Aktifkan untuk menonaktifkan akses publik sementara.
            </p>
          </div>
          <div className="p-6">
            <MaintenanceToggle initialValue={maintenanceMode} />
          </div>
        </div>

        <div className="admin-utility-card overflow-hidden p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4">
            <h2 className="admin-section-title">Announcement Bar</h2>
            <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
              Banner informasi di bagian atas halaman.
            </p>
          </div>
          <div className="flex flex-row gap-2 p-6">
            <AnnouncementForm
              initialText={announcementBar.text}
              initialActive={announcementBar.is_active}
            />
          </div>
        </div>

        <div className="admin-utility-card overflow-hidden p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4">
            <h2 className="admin-section-title">WhatsApp CS</h2>
            <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
              Nomor WhatsApp customer service yang ditampilkan di tombol floating.
            </p>
          </div>
          <div className="p-6">
            <WhatsappForm initialValue={whatsappCs} />
          </div>
        </div>

        <div className="admin-utility-card overflow-hidden p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4">
            <h2 className="admin-section-title">Auto Complete Order</h2>
            <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
              Order otomatis selesai setelah X hari konfirmasi pengiriman.
            </p>
          </div>
          <div className="p-6">
            <AutoCompleteForm initialValue={autoCompleteDays} />
          </div>
        </div>
      </div>
    </div>
  );
}
