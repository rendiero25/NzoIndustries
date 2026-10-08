import "server-only";

import type { ShippingProvider, ShippingRate } from "@/lib/shipping/provider";

/**
 * Tarif uji (D-30): hanya aktif bila BITESHIP_API_KEY kosong dan
 * SHIPPING_TEST_RATES=true. Tarif deterministik dari berat supaya server bisa
 * menghitung ulang nilai yang sama saat pesanan dibuat. Bukan ongkir asli.
 */
const SERVICES = [
  {
    courier: "uji",
    courierName: "Kurir Uji",
    service: "reg",
    serviceName: "Reguler",
    perKg: 10000,
    etd: "2–3 hari",
  },
  {
    courier: "uji",
    courierName: "Kurir Uji",
    service: "exp",
    serviceName: "Kilat",
    perKg: 18000,
    etd: "1 hari",
  },
] as const;

const AREAS = [
  {
    id: "TEST-JKT",
    label: "Gambir, Jakarta Pusat, DKI Jakarta. 10110",
    province: "DKI Jakarta",
    city: "Jakarta Pusat",
    district: "Gambir",
    postalCode: "10110",
  },
  {
    id: "TEST-BDG",
    label: "Coblong, Bandung, Jawa Barat. 40132",
    province: "Jawa Barat",
    city: "Bandung",
    district: "Coblong",
    postalCode: "40132",
  },
  {
    id: "TEST-SBY",
    label: "Genteng, Surabaya, Jawa Timur. 60275",
    province: "Jawa Timur",
    city: "Surabaya",
    district: "Genteng",
    postalCode: "60275",
  },
];

export const testRatesProvider: ShippingProvider = {
  name: "test",

  async searchAreas(query) {
    const q = query.toLowerCase();
    return { ok: true, data: AREAS.filter((a) => a.label.toLowerCase().includes(q)) };
  },

  async getRates(_destination, items) {
    const grams = items.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0);
    const kg = Math.max(1, Math.ceil(grams / 1000));
    const rates: ShippingRate[] = SERVICES.map((s) => ({
      id: `${s.courier}:${s.service}`,
      courierCode: s.courier,
      courierName: s.courierName,
      serviceCode: s.service,
      serviceName: s.serviceName,
      price: s.perKg * kg,
      etd: s.etd,
      isTest: true,
    }));
    return { ok: true, data: rates };
  },
};
