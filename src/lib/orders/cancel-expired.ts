import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";

/**
 * Cancels a single expired/unpaid order by its DB UUID (orders.id).
 * Idempotent — safe to call multiple times; only acts when status === "pending_payment".
 *
 * Side-effects:
 *  - orders.status      → "cancelled"
 *  - order_status_history insert
 *  - product_variants.reserved released
 *  - payments.status    → "expired"  (pending only)
 *  - user + admin notification
 */
export async function cancelExpiredOrder(orderDbId: string): Promise<void> {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, user_id")
    .eq("id", orderDbId)
    .maybeSingle();

  if (!order || order.status !== "pending_payment") return;

  // 1. Claim cancellation atomically. pg_cron, Mayar webhook, and lazy
  // cancellation may arrive together; only winner may run side effects below.
  const { data: cancelledOrder } = await svc
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();
  if (!cancelledOrder) return;

  // 2. Log history
  await svc.from("order_status_history").insert({
    order_id: order.id,
    status: "cancelled",
    note: "Pesanan dibatalkan otomatis karena melewati batas waktu pembayaran.",
    changed_by: null,
  });

  // 3. Release stock reservation
  const { data: items } = await svc
    .from("order_items")
    .select("variant_id, quantity")
    .eq("order_id", order.id);

  if (items) {
    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: v } = await svc
        .from("product_variants")
        .select("reserved")
        .eq("id", item.variant_id)
        .single();
      if (!v) continue;
      await svc
        .from("product_variants")
        .update({ reserved: Math.max(0, v.reserved - item.quantity) })
        .eq("id", item.variant_id);
    }
  }

  // 4. Mark payment(s) as expired
  await svc
    .from("payments")
    .update({ status: "expired" })
    .eq("order_id", order.id)
    .eq("status", "pending");

  // 5. Notify user
  if (order.user_id) {
    await createNotification({
      userId: order.user_id,
      title: "Pembayaran Kedaluwarsa",
      body: `Pesanan ${order.order_number} dibatalkan karena melewati batas waktu pembayaran.`,
      type: "payment_expired",
      data: { orderId: order.id, orderNumber: order.order_number },
    });
  }

  // 6. Notify admin
  await createAdminNotification({
    title: "Pesanan Dibatalkan Otomatis",
    body: `Pesanan ${order.order_number} dibatalkan karena batas waktu pembayaran habis.`,
    type: "payment_expired",
    data: { orderId: order.id, orderNumber: order.order_number },
  });
}
