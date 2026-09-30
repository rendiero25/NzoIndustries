import { createServiceClient } from "@/lib/supabase/server";
import { cancelExpiredOrder } from "@/lib/orders/cancel-expired";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-orders
 *
 * Otomatis membatalkan pesanan pending_payment yang sudah melewati batas waktu pembayaran.
 * Dipanggil via cron-job.org setiap 5-10 menit dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Logika expiry:
 *  - Jika ada payment record dengan expiry_time → bandingkan dengan now
 *  - Jika tidak ada payment / tidak ada expiry_time → fallback: created_at + 3 jam
 */
export async function GET(req: Request) {
  // Verify CRON_SECRET if set
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const svc = createServiceClient();
    const now = new Date().toISOString();
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    // Query 1: orders with a pending payment whose expiry_time has passed
    const { data: expiredPayments } = await svc
      .from("payments")
      .select("order_id")
      .eq("status", "pending")
      .not("expiry_time", "is", null)
      .lt("expiry_time", now);

    // Query 2: pending_payment orders older than 3 hours with no payment record
    //          (fallback for payments never confirmed by the Mayar webhook)
    const { data: oldOrders } = await svc
      .from("orders")
      .select("id")
      .eq("status", "pending_payment")
      .lt("created_at", threeHoursAgo);

    // Deduplicate
    const toCancel = new Set<string>([
      ...(expiredPayments ?? []).map((p) => p.order_id),
      ...(oldOrders ?? []).map((o) => o.id),
    ]);

    if (toCancel.size === 0) {
      return Response.json({ ok: true, cancelled: 0, errors: [] });
    }

    let cancelled = 0;
    const errors: string[] = [];

    for (const orderId of toCancel) {
      try {
        await cancelExpiredOrder(orderId);
        cancelled++;
      } catch {
        errors.push(orderId);
      }
    }

    return Response.json({ ok: true, cancelled, errors });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
