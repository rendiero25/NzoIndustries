import "server-only";

/**
 * Resolusi koordinat (lat/lng) tujuan dari kode pos Indonesia, untuk kurir
 * on-demand/instant (GoSend/Gojek, GrabExpress, dll) yang WAJIB punya koordinat.
 *
 * Catatan investigasi (kenapa tidak pakai Biteship):
 *   - Biteship Maps Areas API (GET /v1/maps/areas) TIDAK mengembalikan field
 *     `coordinate` untuk input kode pos — hanya metadata area + `id`.
 *   - Order instant courier yang dikirim dengan `destination_area_id` saja (tanpa
 *     koordinat) ditolak: 400 `40002021` (ErrOrderFailedGettingCourierRates).
 *     Jadi area_id TIDAK bisa menggantikan koordinat.
 *   => Koordinat harus didapat dari geocoder.
 *
 * Urutan resolusi:
 *   1. Cache Supabase (geocode_cache) — tiap kode pos digeocode maksimal sekali.
 *   2. Geocoder produksi free-tier: Geoapify lalu LocationIQ (pakai yang key-nya ada).
 *   3. OpenStreetMap Nominatim — HANYA last-resort (rate-limited, TOS membatasi produksi).
 *
 * Setiap hasil sukses (provider maupun Nominatim) ditulis ke cache.
 */

export type LatLng = { lat: number; lng: number };

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Normalisasi ke maksimal 5 digit angka. Mengembalikan null kalau bukan kode pos valid. */
function normalizePostal(postalCode: string): string | null {
  const digits = postalCode.replace(/\D/g, "").slice(0, 5);
  return digits.length >= 3 ? digits : null;
}

// ---------------------------------------------------------------------------
// Cache memori per instance server (schema NZO tidak punya tabel geocode_cache).
// ---------------------------------------------------------------------------

const memoryCache = new Map<string, LatLng>();
const MAX_CACHE = 2000;

async function readCache(postal: string): Promise<LatLng | null> {
  return memoryCache.get(postal) ?? null;
}

async function writeCache(postal: string, coord: LatLng): Promise<void> {
  if (memoryCache.size >= MAX_CACHE) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(postal, coord);
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

type GeoapifyResponse = { results?: { lat?: number; lon?: number }[] };

/** Geoapify Geocoding API — sumber utama (free tier ~3rb/hari, tanpa kartu kredit). */
async function fetchFromGeoapify(postal: string): Promise<LatLng | null> {
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(postal)}&filter=countrycode:id&format=json&limit=1&apiKey=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as GeoapifyResponse;
    const first = json.results?.[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

type LocationIQResult = { lat?: string; lon?: string };

/** LocationIQ Search API — alternatif (free tier ~5rb/hari, butuh akun). Format kompatibel Nominatim. */
async function fetchFromLocationIQ(postal: string): Promise<LatLng | null> {
  const key = process.env.LOCATIONIQ_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/search?key=${encodeURIComponent(key)}&q=${encodeURIComponent(postal)}&countrycodes=id&format=json&limit=1`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as LocationIQResult[];
    const first = json[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

type NominatimResult = { lat?: string; lon?: string };

/** Last-resort fallback: OpenStreetMap Nominatim (no API key). Rate-limited ~1 req/s. */
async function fetchFromNominatim(postal: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postal)}&country=Indonesia&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "NZO Industries/1.0 (nzo-industries.test)",
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as NominatimResult[];
    const first = json[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

/** Geocoder produksi free-tier. Pakai provider yang API key-nya tersedia. */
async function fetchFromProvider(
  postal: string,
): Promise<{ coord: LatLng; source: string } | null> {
  const geoapify = await fetchFromGeoapify(postal);
  if (geoapify) return { coord: geoapify, source: "geoapify" };

  const locationiq = await fetchFromLocationIQ(postal);
  if (locationiq) return { coord: locationiq, source: "locationiq" };

  return null;
}

/**
 * Resolve lat/lng untuk kode pos Indonesia.
 * Cache → geocoder produksi (Geoapify/LocationIQ) → Nominatim (last-resort).
 */
export async function fetchCoordinatesFromPostal(postalCode: string): Promise<LatLng | null> {
  const postal = normalizePostal(postalCode);
  if (!postal) return null;

  const cached = await readCache(postal);
  if (cached) return cached;

  const provider = await fetchFromProvider(postal);
  if (provider) {
    await writeCache(postal, provider.coord);
    return provider.coord;
  }

  const nominatim = await fetchFromNominatim(postal);
  if (nominatim) {
    await writeCache(postal, nominatim);
    return nominatim;
  }

  return null;
}
