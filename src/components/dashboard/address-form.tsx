"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAddressAction,
  updateAddressAction,
} from "@/app/(dashboard)/dashboard/addresses/_actions";
import { AreaAutocomplete, type BiteshipArea } from "@/components/dashboard/area-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/types/legacy-supabase";
import dynamic from "next/dynamic";
import type { LatLng } from "@/components/dashboard/location-picker";

const LocationPicker = dynamic(
  () => import("@/components/dashboard/location-picker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-steel-200" />,
  },
);

type AddressRow = Database["public"]["Tables"]["addresses"]["Row"];

export function AddressForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: AddressRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [province, setProvince] = useState(initial?.province ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [kelurahan, setKelurahan] = useState(initial?.kelurahan ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postal_code ?? "");
  const [coords, setCoords] = useState<LatLng | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);

  const handleAreaSelect = (area: BiteshipArea) => {
    setProvince(area.administrative_division_level_1_name);
    setCity(area.administrative_division_level_2_name);
    setDistrict(area.administrative_division_level_3_name);
    setPostalCode(String(area.postal_code));

    void (async () => {
      try {
        const res = await fetch("/api/geo/postal-coords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postalCode: String(area.postal_code) }),
        });
        const json = (await res.json()) as { success: boolean; data: LatLng | null };
        if (json.success && json.data) setMapCenter(json.data);
      } catch {
        // centering optional — pin tetap bisa digeser manual
      }
    })();
  };

  return (
    <form
      className="mx-auto w-full max-w-xl space-y-4 rounded-xl border border-border bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const payload = {
          label: String(fd.get("label") ?? ""),
          recipient: String(fd.get("recipient") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          province,
          city,
          district,
          kelurahan,
          postal_code: postalCode,
          full_address: String(fd.get("full_address") ?? ""),
          is_default: fd.get("is_default") != null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        };
        startTransition(async () => {
          const res =
            mode === "create"
              ? await createAddressAction(payload)
              : await updateAddressAction({ ...payload, id: initial!.id });
          if (res.success) {
            toast.success(mode === "create" ? "Alamat ditambahkan." : "Alamat diperbarui.");
            router.push("/dashboard/addresses");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="label">Label (opsional)</Label>
          <Input
            id="label"
            name="label"
            placeholder="Rumah / Kantor"
            defaultValue={initial?.label ?? ""}
            className="mt-1 border-border"
          />
        </div>
        <div>
          <Label htmlFor="recipient">Penerima</Label>
          <Input
            id="recipient"
            name="recipient"
            required
            defaultValue={initial?.recipient ?? ""}
            className="mt-1 border-border"
          />
        </div>
        <div>
          <Label htmlFor="phone">Telepon</Label>
          <Input
            id="phone"
            name="phone"
            required
            defaultValue={initial?.phone ?? ""}
            className="mt-1 border-border"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
          Cari area otomatis
        </p>
        <AreaAutocomplete onSelect={handleAreaSelect} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ketik nama kelurahan atau kecamatan — provinsi, kota, dan kode pos akan terisi otomatis.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
          Titik lokasi (untuk kurir instan: GoSend/Grab)
        </p>
        <LocationPicker value={coords} onChange={setCoords} center={mapCenter} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Opsional. Jika tidak diisi, sistem memakai titik dari kode pos otomatis.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="province">Provinsi</Label>
          <Input
            id="province"
            name="province"
            required
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="mt-1 border-border"
          />
        </div>
        <div>
          <Label htmlFor="city">Kota / Kabupaten</Label>
          <Input
            id="city"
            name="city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 border-border"
          />
        </div>
        <div>
          <Label htmlFor="district">Kecamatan</Label>
          <Input
            id="district"
            name="district"
            required
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="mt-1 border-border"
          />
        </div>
        <div>
          <Label htmlFor="kelurahan">Kelurahan / Desa</Label>
          <Input
            id="kelurahan"
            name="kelurahan"
            value={kelurahan}
            onChange={(e) => setKelurahan(e.target.value)}
            className="mt-1 border-border"
          />
        </div>
        <div>
          <Label htmlFor="postal_code">Kode pos</Label>
          <Input
            id="postal_code"
            name="postal_code"
            required
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="mt-1 border-border"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="full_address">Alamat lengkap</Label>
          <Input
            id="full_address"
            name="full_address"
            required
            defaultValue={initial?.full_address ?? ""}
            placeholder="Nama jalan, nomor, RT/RW, gedung, dll."
            className="mt-1 border-border"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="is_default"
          name="is_default"
          defaultChecked={initial?.is_default ?? false}
          className="h-4 w-4 rounded border border-border accent-black"
        />
        <Label htmlFor="is_default" className="text-sm font-normal">
          Jadikan alamat utama
        </Label>
      </div>

      <div className="mt-4 flex gap-3">
        <Button type="submit" variant="primary" loading={pending}>
          {mode === "create" ? "Simpan alamat" : "Perbarui alamat"}
        </Button>
        {mode === "edit" && (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => router.push("/dashboard/addresses")}
          >
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}
