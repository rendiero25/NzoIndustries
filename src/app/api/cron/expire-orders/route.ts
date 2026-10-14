import { getServerEnv } from "@/lib/env";
import { providerForRef } from "@/lib/payments/provider";
import { isCronAuthorized } from "@/lib/security/secret";
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
export async function GET(req: Request) {
  if (!isCronAuthorized(req, getServerEnv().CRON_SECRET)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc("release_expired_orders");
  if (error) {
    console.error("[cron expire-orders]", error.code);
    return Response.json({ ok: false }, { status: 500 });
  }

  // Tutup link bayar Mayar yang ikut expired (best effort; pelunasan setelah ini
  // tetap tercatat sebagai paid_after_cancel untuk ditangani admin).
  const refs = (data ?? []).map((r) => r.provider_ref).filter((r): r is string => !!r);
  await Promise.allSettled(
    refs.map(async (ref) => {
      await providerForRef(ref)?.close(ref);
    }),
  );
  return Response.json({ ok: true, expired: data?.length ?? 0 });
}
