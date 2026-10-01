import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/legacy/server";
import { SettingsNav } from "../_components/settings-nav";
import { TimeoutForm } from "./_components/timeout-form";

export const metadata: Metadata = { title: "Pembayaran — Admin NZO Industries" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

export default async function AdminSettingsPaymentPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["payment_timeout_hours"]);

  const get = (key: string): unknown => rows?.find((r: SettingRow) => r.key === key)?.value;

  const paymentTimeoutHours = (get("payment_timeout_hours") as number) ?? 3;

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Toko</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Pembayaran</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Batas waktu dan perilaku pembayaran.
        </p>
      </div>

      <SettingsNav />

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-[#e0e0e0] px-5 py-4">
          <h2 className="admin-section-title">Batas Waktu Pembayaran</h2>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            Pesanan otomatis dibatalkan jika tidak dibayar dalam X jam.
          </p>
        </div>
        <div className="p-6">
          <TimeoutForm initialValue={paymentTimeoutHours} />
        </div>
      </div>
    </div>
  );
}
