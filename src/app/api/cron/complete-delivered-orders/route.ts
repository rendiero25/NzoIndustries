import { getServerEnv } from "@/lib/env";
import { isCronAuthorized } from "@/lib/security/secret";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/complete-delivered-orders  (Authorization: Bearer <CRON_SECRET>)
 *
 * Pesanan `delivered` lebih dari 3 hari otomatis `completed` (RPC
 * `system_complete_delivered_orders`). Dijadwalkan harian (cron-job.org).
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req, getServerEnv().CRON_SECRET)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("system_complete_delivered_orders", {
    p_days: 3,
  });
  if (error) {
    console.error("[cron complete-delivered-orders]", error.code);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, completed: data ?? 0 });
}
