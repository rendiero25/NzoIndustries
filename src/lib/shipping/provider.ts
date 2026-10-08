import "server-only";

import { getServerEnv } from "@/lib/env";
import { biteshipProvider } from "@/lib/shipping/biteship";
import { testRatesProvider } from "@/lib/shipping/stub";

/** Lapisan ongkir (D-30). Implementasi: Biteship, atau tarif uji di dev/staging. */
export type ShippingArea = {
  id: string;
  label: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
};

export type ShippingDestination = {
  areaId: string | null;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

export type ShippingParcelItem = {
  name: string;
  /** Nilai barang per unit (rupiah) untuk asuransi/estimasi kurir. */
  value: number;
  quantity: number;
  /** Berat tagihan per unit (gram), sudah memperhitungkan volumetrik. */
  weightGrams: number;
};

export type ShippingRate = {
  /** `${courierCode}:${serviceCode}`, dipakai untuk mencocokkan pilihan user. */
  id: string;
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  price: number;
  etd: string;
  isTest: boolean;
};

export type ShippingResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ShippingProvider {
  readonly name: "biteship" | "test";
  searchAreas(query: string): Promise<ShippingResult<ShippingArea[]>>;
  getRates(
    destination: ShippingDestination,
    items: ShippingParcelItem[],
  ): Promise<ShippingResult<ShippingRate[]>>;
}

/** null = ongkir belum dikonfigurasi (tanpa key dan tarif uji tidak diizinkan). */
export function getShippingProvider(): ShippingProvider | null {
  const env = getServerEnv();
  if (env.BITESHIP_API_KEY) return biteshipProvider;
  if (env.SHIPPING_TEST_RATES === "true") return testRatesProvider;
  return null;
}

export const SHIPPING_NOT_CONFIGURED = "Ongkir belum tersedia. Hubungi kami lewat WhatsApp.";
