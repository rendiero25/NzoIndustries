import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/legacy/server";
import { SettingsNav } from "../_components/settings-nav";
import { OriginForm } from "./_components/origin-form";
import { parseStoreOrigin } from "@/lib/settings/store-origin";

export const metadata: Metadata = { title: "Pengiriman · Admin" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

export default async function AdminSettingsShippingPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .eq("key", "store_origin");

  const raw = rows?.find((r: SettingRow) => r.key === "store_origin")?.value;
  const storeOrigin = parseStoreOrigin(raw);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Toko</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Pengiriman</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Alamat origin toko untuk kalkulasi ongkir dan pengiriman.
        </p>
      </div>

      <SettingsNav />

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4">
          <h2 className="admin-section-title">Alamat Origin Toko</h2>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            Alamat pengirim yang digunakan saat kalkulasi ongkos kirim dan pembuatan pengiriman.
          </p>
        </div>
        <div className="p-6">
          <OriginForm initialValue={storeOrigin} />
        </div>
      </div>
    </div>
  );
}
