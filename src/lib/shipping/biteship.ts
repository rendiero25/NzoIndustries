import "server-only";

import { getServerEnv } from "@/lib/env";
import type {
  ShippingArea,
  ShippingProvider,
  ShippingRate,
  ShippingResult,
} from "@/lib/shipping/provider";

/**
 * Biteship (ongkir). Key, origin gudang (P-11), dan kurir (P-12) dari env.
 * Pesan error ke user dibuat umum; detail teknis hanya di log server
 * (tanpa alamat lengkap, security rule 13).
 */
const BASE_URL = "https://api.biteship.com";

type AreaRow = {
  id?: string;
  name?: string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
  postal_code?: string | number;
};

type PricingRow = {
  courier_code?: string;
  courier_service_code?: string;
  courier_name?: string;
  courier_service_name?: string;
  price?: number;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
};

function headers(key: string): HeadersInit {
  return {
    Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function etd(row: PricingRow): string {
  const range = row.shipment_duration_range;
  if (range) {
    const unit = row.shipment_duration_unit === "hours" ? "jam" : "hari";
    return `${range} ${unit}`;
  }
  return row.duration ?? "Estimasi dari kurir";
}

export const biteshipProvider: ShippingProvider = {
  name: "biteship",

  async searchAreas(query): Promise<ShippingResult<ShippingArea[]>> {
    const key = getServerEnv().BITESHIP_API_KEY;
    if (!key) return { ok: false, error: "Ongkir belum dikonfigurasi." };
    try {
      const url = `${BASE_URL}/v1/maps/areas?countries=ID&type=single&input=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: headers(key), next: { revalidate: 3600 } });
      const json = (await res.json()) as { success?: boolean; areas?: AreaRow[] };
      if (!res.ok || !json.success) {
        console.error("[biteship areas]", res.status);
        return { ok: false, error: "Pencarian wilayah gagal. Coba lagi." };
      }
      const areas = (json.areas ?? [])
        .filter((a) => a.id && a.postal_code)
        .slice(0, 20)
        .map((a) => ({
          id: String(a.id),
          label: String(a.name ?? ""),
          province: String(a.administrative_division_level_1_name ?? ""),
          city: String(a.administrative_division_level_2_name ?? ""),
          district: String(a.administrative_division_level_3_name ?? ""),
          postalCode: String(a.postal_code),
        }));
      return { ok: true, data: areas };
    } catch {
      return { ok: false, error: "Pencarian wilayah gagal. Coba lagi." };
    }
  },

  async getRates(destination, items): Promise<ShippingResult<ShippingRate[]>> {
    const env = getServerEnv();
    const key = env.BITESHIP_API_KEY;
    if (!key) return { ok: false, error: "Ongkir belum dikonfigurasi." };
    if (!env.BITESHIP_ORIGIN_AREA_ID && !env.BITESHIP_ORIGIN_POSTAL_CODE) {
      return { ok: false, error: "Alamat gudang belum diatur." };
    }

    const body: Record<string, unknown> = {
      couriers: env.BITESHIP_COURIERS,
      items: items.map((i) => ({
        name: i.name.slice(0, 100),
        value: Math.max(1000, Math.round(i.value)),
        quantity: i.quantity,
        weight: Math.max(1, Math.round(i.weightGrams)),
      })),
    };
    if (env.BITESHIP_ORIGIN_AREA_ID) body.origin_area_id = env.BITESHIP_ORIGIN_AREA_ID;
    else body.origin_postal_code = Number(env.BITESHIP_ORIGIN_POSTAL_CODE);
    if (destination.areaId) body.destination_area_id = destination.areaId;
    else body.destination_postal_code = Number(destination.postalCode);

    try {
      const res = await fetch(`${BASE_URL}/v1/rates/couriers`, {
        method: "POST",
        headers: headers(key),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        pricing?: PricingRow[];
        error?: string;
      };
      if (!res.ok || !json.success || !Array.isArray(json.pricing)) {
        console.error("[biteship rates]", res.status, json.error ?? "");
        return {
          ok: false,
          error: "Ongkir tidak dapat dihitung untuk alamat ini. Coba lagi nanti.",
        };
      }
      const rates = json.pricing
        .filter((p) => p.courier_code && p.courier_service_code && typeof p.price === "number")
        .map((p) => ({
          id: `${p.courier_code}:${p.courier_service_code}`,
          courierCode: String(p.courier_code),
          courierName: String(p.courier_name ?? p.courier_code),
          serviceCode: String(p.courier_service_code),
          serviceName: String(p.courier_service_name ?? p.courier_service_code),
          price: Math.max(0, Math.round(Number(p.price))),
          etd: etd(p),
          isTest: false,
        }))
        .sort((a, b) => a.price - b.price);
      if (rates.length === 0) {
        return { ok: false, error: "Belum ada kurir yang melayani alamat ini." };
      }
      return { ok: true, data: rates };
    } catch {
      return { ok: false, error: "Ongkir tidak dapat dihitung saat ini. Coba lagi nanti." };
    }
  },
};
