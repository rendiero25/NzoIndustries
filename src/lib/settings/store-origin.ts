export type StoreOrigin = {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  address: string;
  /** Origin latitude — required for on-demand couriers (GoSend, Grab, etc.) */
  lat?: string;
  /** Origin longitude — required for on-demand couriers (GoSend, Grab, etc.) */
  lng?: string;
};

export const DEFAULT_STORE_ORIGIN: StoreOrigin = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  postal_code: "",
  address: "",
  lat: "",
  lng: "",
};

export function parseStoreOrigin(raw: unknown): StoreOrigin {
  const partial = (raw ?? {}) as Partial<StoreOrigin>;
  return {
    ...DEFAULT_STORE_ORIGIN,
    ...partial,
    subdistrict: partial.subdistrict ?? "",
    lat: partial.lat ?? "",
    lng: partial.lng ?? "",
  };
}

/** Alamat lengkap satu baris untuk ditampilkan ke publik (footer, contact page). */
export function getStoreOriginFullAddress(origin: StoreOrigin): string {
  return [
    origin.address,
    origin.subdistrict,
    origin.district,
    origin.city,
    origin.province,
    origin.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

/** URL Google Maps — pakai koordinat kalau ada, fallback ke pencarian teks alamat. */
export function getStoreOriginMapsUrl(origin: StoreOrigin): string {
  if (origin.lat && origin.lng) {
    return `https://www.google.com/maps?q=${origin.lat},${origin.lng}`;
  }
  const fullAddress = getStoreOriginFullAddress(origin);
  const query = fullAddress || origin.name || "NZO Industries";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
