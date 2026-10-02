"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsLabelClass } from "../../_lib/label-class";
import { saveSetting } from "../../_actions";
import type { StoreOrigin } from "@/lib/settings/store-origin";

interface OriginFormProps {
  initialValue: StoreOrigin;
}

export function OriginForm({ initialValue }: OriginFormProps) {
  const [form, setForm] = useState<StoreOrigin>(initialValue);
  const [isPending, startTransition] = useTransition();

  const set = (field: keyof StoreOrigin) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("store_origin", form);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Alamat origin toko diperbarui.");
    });
  };

  const inputClass = "h-10 rounded-lg border-border text-sm";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Nama Toko / Pengirim</label>
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="NZO Industries Store"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Nomor Telepon</label>
          <Input
            value={form.phone}
            onChange={set("phone")}
            placeholder="6281234567890"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Provinsi</label>
          <Input
            value={form.province}
            onChange={set("province")}
            placeholder="DKI Jakarta"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Kota / Kabupaten</label>
          <Input
            value={form.city}
            onChange={set("city")}
            placeholder="Jakarta Selatan"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Kecamatan</label>
          <Input
            value={form.district}
            onChange={set("district")}
            placeholder="Kebayoran Baru"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Kelurahan</label>
          <Input
            value={form.subdistrict}
            onChange={set("subdistrict")}
            placeholder="Senayan"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Kode Pos</label>
          <Input
            value={form.postal_code}
            onChange={set("postal_code")}
            placeholder="12180"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={settingsLabelClass}>Alamat Lengkap</label>
          <Input
            value={form.address}
            onChange={set("address")}
            placeholder="Jl. Raya No. 1"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Koordinat Origin (Kurir On-Demand)
          </p>
          <p className="text-xs text-muted-foreground">
            Wajib diisi untuk kurir GoSend, GrabExpress, Borzo, dll. Gunakan Google Maps → klik
            lokasi toko → salin koordinat.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Latitude</label>
          <Input
            value={form.lat ?? ""}
            onChange={set("lat")}
            placeholder="-6.208763"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className={settingsLabelClass}>Longitude</label>
          <Input
            value={form.lng ?? ""}
            onChange={set("lng")}
            placeholder="106.845599"
            className={inputClass}
          />
        </div>
      </div>
      <Button type="button" variant="primary" size="sm" onClick={handleSave} loading={isPending}>
        Simpan
      </Button>
    </div>
  );
}
