/** Shared utilities for on-demand courier (GoSend, GrabExpress, etc.) coordinate resolution. */

import { fetchCoordinatesFromPostal } from "@/lib/geo/geocode-destination";
import { BITESHIP_COURIER_BRANDS } from "@/lib/biteship/courier-brands";

// Single source of truth — derived from BITESHIP_COURIER_BRANDS onDemand flag.
// On-demand: gojek, gosend, grab, borzo, lalamove, deliveree, rara
// Standard (later): all others (jne, sicepat, jnt, anteraja, tiki, ninja, lion,
//   wahana, sap, pos, idexpress, paxel, rpx, jdl, sentralcargo, dash_express)
export const ON_DEMAND_COURIERS = new Set(
  BITESHIP_COURIER_BRANDS.filter((b) => b.onDemand).map((b) => b.code),
);

/**
 * Check if current Asia/Jakarta (WIB) time is inside Gojek/Grab Same Day pickup window.
 * Biteship enforces 06:00–15:00 WIB cutoff; outside this window Same Day is rejected.
 * We apply a 1-hour pre-cutoff buffer (filter from 14:00 WIB) so payment + Biteship
 * round-trip can still complete before 15:00.
 */
export function isWithinSameDayWindow(now: Date = new Date()): boolean {
  // WIB = UTC+7
  const wibHour = (now.getUTCHours() + 7) % 24;
  return wibHour >= 6 && wibHour < 14;
}

/** Identify on-demand same-day services from Biteship rates response. */
export function isOnDemandSameDayOption(courierCode: string, serviceCode: string): boolean {
  const company = courierCode.toLowerCase();
  if (!ON_DEMAND_COURIERS.has(company)) return false;
  const service = serviceCode.toLowerCase().replace(/[_\s-]/g, "");
  return service === "sameday";
}

export type OriginCoords = { lat: number; lng: number };

function parseFromEnv(): OriginCoords | null {
  const combined = process.env.GOJEK_GOSEND_LAT_LANG?.trim();
  if (combined) {
    const [lat, lng] = combined.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(process.env.GOJEK_GOSEND_LAT?.trim());
  // GOJEK_GOSEN_LANG is kept as legacy fallback (typo variant still supported)
  const lng = Number(process.env.GOJEK_GOSEND_LANG?.trim() ?? process.env.GOJEK_GOSEN_LANG?.trim());
  if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) {
    return { lat, lng };
  }
  return null;
}

function parseFromSettings(
  storeOrigin: { lat?: string; lng?: string } | null | undefined,
): OriginCoords | null {
  if (!storeOrigin) return null;
  const lat = parseFloat(storeOrigin.lat ?? "");
  const lng = parseFloat(storeOrigin.lng ?? "");
  if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) {
    return { lat, lng };
  }
  return null;
}

/**
 * Resolve origin lat/lng for on-demand couriers.
 * Priority: GOJEK_GOSEND_LAT_LANG env var → individual env vars → store_origin DB setting.
 * The storeOrigin parameter comes from the `store_origin` settings row (configurable in admin UI).
 */
export function parseOriginCoords(
  storeOrigin?: { lat?: string; lng?: string } | null,
): OriginCoords | null {
  return parseFromEnv() ?? parseFromSettings(storeOrigin);
}

export type OnDemandCoordFields = {
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
};

/**
 * Resolve the origin + destination lat/lng fields Biteship requires for on-demand
 * couriers (GoSend, GrabExpress, etc.). Returns an empty object for non-on-demand
 * couriers, or when origin coordinates are not configured (env var nor store_origin
 * DB setting) — callers then create the order without coordinates.
 *
 * Used by BOTH settlement paths (Mayar webhook and verify-payment) so they
 * resolve coordinates identically. Keep this the single source of truth.
 */
export async function resolveOnDemandCoords(
  courierCompany: string,
  destPostal: number,
  storeOrigin: { lat?: string; lng?: string } | null,
  preferredDest?: { lat: number | null; lng: number | null } | null,
): Promise<OnDemandCoordFields> {
  if (!ON_DEMAND_COURIERS.has(courierCompany.toLowerCase())) return {};
  const originCoords = parseOriginCoords(storeOrigin);
  if (!originCoords) return {};

  let destLat: number | undefined;
  let destLng: number | undefined;
  if (preferredDest && preferredDest.lat != null && preferredDest.lng != null) {
    // Snapshot from the order (most accurate — user pin / map centering).
    destLat = preferredDest.lat;
    destLng = preferredDest.lng;
  } else {
    // Fallback for orders/addresses without stored coordinates.
    const destCoords = await fetchCoordinatesFromPostal(String(destPostal));
    destLat = destCoords?.lat;
    destLng = destCoords?.lng;
  }

  return {
    originLat: originCoords.lat,
    originLng: originCoords.lng,
    destLat,
    destLng,
  };
}
