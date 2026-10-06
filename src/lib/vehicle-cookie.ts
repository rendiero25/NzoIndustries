/**
 * Kendaraan aktif (Garasi) disimpan di cookie supaya guest juga bisa memakai
 * filter kecocokan. Bukan data sensitif; tetap divalidasi dan dicek ke DB
 * saat dibaca server.
 */
export const VEHICLE_COOKIE = "nzo_vehicle";
export const VEHICLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type VehicleCookie = { modelId: string; year: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseVehicleCookie(value: string | undefined | null): VehicleCookie | null {
  if (!value) return null;
  const [modelId, yearRaw] = decodeURIComponent(value).split(":");
  const year = Number(yearRaw);
  if (!modelId || !UUID.test(modelId) || !Number.isInteger(year) || year < 1950 || year > 2100)
    return null;
  return { modelId: modelId.toLowerCase(), year };
}

export function serializeVehicleCookie(v: VehicleCookie): string {
  return `${v.modelId}:${v.year}`;
}

/** Tahun yang bisa dipilih untuk model (terbaru dulu). */
export function modelYears(yearStart: number, yearEnd: number | null, now = new Date()): number[] {
  const end = Math.min(yearEnd ?? now.getFullYear() + 1, now.getFullYear() + 1);
  const years: number[] = [];
  for (let y = end; y >= yearStart; y--) years.push(y);
  return years;
}
