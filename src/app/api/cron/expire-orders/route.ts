import { timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-orders  (Authorization: Bearer <CRON_SECRET>)
 *
 * Pesanan `pending_payment` lewat `payment_due_at` → `expired`; reservasi stok,
 * kuota flash sale, dan voucher dilepas (RPC `release_expired_orders`).
 * Dijadwalkan tiap 10 menit (cron-job.org). Stok tetap aman bila cron telat:
 * reservasi kedaluwarsa tidak dihitung di `available_stock`.
 */
function authorized(req: Request): boolean {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc("release_expired_orders");
  if (error) {
    console.error("[cron expire-orders]", error.code);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, expired: data ?? 0 });
}
