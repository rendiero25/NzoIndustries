import "server-only";

import type { CheckoutShippingOption } from "@/lib/shipping/checkout-shipping-options";

type BiteshipPricingRow = {
  courier_code?: string;
  courier_service_code?: string;
  courier_name?: string;
  courier_service_name?: string;
  price?: number;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
};

type BiteshipRatesResponse = {
  success?: boolean;
  pricing?: BiteshipPricingRow[];
  message?: string;
  error?: string;
};

function etdFromRow(row: BiteshipPricingRow): string {
  if (row.duration && typeof row.duration === "string") return row.duration;
  const r = row.shipment_duration_range;
  const u = row.shipment_duration_unit === "days" ? "hari" : (row.shipment_duration_unit ?? "");
  if (r && u) return `${r} ${u}`;
  return "Estimasi dari kurir";
}

export async function fetchBiteshipCourierRates(params: {
  originPostal: number;
  destinationPostal: number;
  items: {
    name: string;
    value: number;
    quantity: number;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
  }[];
  couriers: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
}): Promise<{ ok: true; options: CheckoutShippingOption[] } | { ok: false; error: string }> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Biteship tidak dikonfigurasi." };
  }

  const base = "https://api.biteship.com";
  const couriers = params.couriers;

  const body: Record<string, unknown> = {
    origin_postal_code: String(params.originPostal),
    destination_postal_code: String(params.destinationPostal),
    couriers,
    items: params.items.map((i) => ({
      name: i.name,
      value: Math.max(1000, Math.round(i.value)),
      quantity: i.quantity,
      weight: Math.max(1, Math.round(i.weight)),
      length: i.length && i.length > 0 ? i.length : 10,
      width: i.width && i.width > 0 ? i.width : 10,
      height: i.height && i.height > 0 ? i.height : 10,
    })),
  };

  if (params.originLat !== undefined && params.originLng !== undefined) {
    body.origin_latitude = params.originLat;
    body.origin_longitude = params.originLng;
  }
  if (params.destLat !== undefined && params.destLng !== undefined) {
    body.destination_latitude = params.destLat;
    body.destination_longitude = params.destLng;
  }

  try {
    const res = await fetch(`${base}/v1/rates/couriers`, {
      method: "POST",
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = (await res.json()) as BiteshipRatesResponse;
    if (!res.ok || !json.success || !Array.isArray(json.pricing)) {
      const raw = json.message ?? json.error ?? `Biteship error ${res.status}`;
      console.error("[Biteship rates]", res.status, raw, JSON.stringify(body));
      // Terjemahkan pesan teknis Biteship menjadi pesan yang actionable untuk admin.
      const isCoverageError =
        typeof raw === "string" &&
        (raw.toLowerCase().includes("no courier available") ||
          raw.toLowerCase().includes("activate other courier"));
      const errMsg = isCoverageError
        ? "Kurir yang dipilih tidak tersedia untuk rute ini. Coba aktifkan kurir lain di Admin → Pengaturan → Kurir."
        : "Layanan pengiriman tidak dapat dihubungi. Coba beberapa saat lagi.";
      return { ok: false, error: errMsg };
    }

    const options: CheckoutShippingOption[] = json.pricing
      .filter((p) => p.courier_code && p.courier_service_code && typeof p.price === "number")
      .map((p) => ({
        courierCode: String(p.courier_code),
        serviceCode: String(p.courier_service_code),
        courierName: String(p.courier_name ?? p.courier_code),
        serviceName: String(p.courier_service_name ?? p.courier_service_code),
        price: Math.round(Number(p.price)),
        etd: etdFromRow(p),
      }));

    if (options.length === 0) {
      return {
        ok: false,
        error:
          "Tidak ada layanan pengiriman untuk rute ini. Coba aktifkan kurir lain di Admin → Pengaturan → Kurir.",
      };
    }

    return { ok: true, options };
  } catch {
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
