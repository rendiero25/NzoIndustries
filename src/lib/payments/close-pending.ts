import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { closeMayarPayment } from "@/lib/mayar/client";

/**
 * Closes the Mayar payment links of an order that is cancelled before payment,
 * so the customer can no longer pay a dead order. Best-effort: the link also
 * expires on its own at payments.expiry_time.
 */
export async function closePendingMayarPayments(orderId: string): Promise<void> {
  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("payments")
    .select("id, mayar_payment_id")
    .eq("order_id", orderId)
    .eq("status", "pending");

  for (const row of rows ?? []) {
    if (row.mayar_payment_id) {
      const res = await closeMayarPayment(row.mayar_payment_id);
      if (!res.ok) console.error("[closePendingMayarPayments] close failed:", res.error);
    }
    await svc
      .from("payments")
      .update({ status: "cancelled" })
      .eq("id", row.id)
      .eq("status", "pending");
  }
}
