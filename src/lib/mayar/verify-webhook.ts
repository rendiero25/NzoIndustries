import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Mayar sends the merchant's callback token in the `x-callback-token` header.
 * Compared via SHA-256 digests so timingSafeEqual always gets equal-length input.
 */
export function verifyMayarWebhookToken(headers: Headers): boolean {
  const expected = process.env.MAYAR_WEBHOOK_TOKEN?.trim();
  if (!expected) return false;

  const received = headers.get("x-callback-token")?.trim();
  if (!received) return false;

  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
