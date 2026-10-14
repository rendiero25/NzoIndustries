import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Bandingkan rahasia tanpa bocor lewat waktu eksekusi. Rahasia kosong = selalu tolak. */
export function safeEqual(
  given: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Header `Authorization: Bearer <CRON_SECRET>` untuk /api/cron/*. */
export function isCronAuthorized(req: Request, secret: string | undefined): boolean {
  return safeEqual(req.headers.get("authorization"), secret ? `Bearer ${secret}` : undefined);
}
