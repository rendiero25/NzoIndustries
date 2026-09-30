import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import {
  getMayarPayment,
  getMayarTransaction,
  normalizeMayarPaymentMethod,
} from "@/lib/mayar/client";
import { applyPaidOrder, type ApplyPaidOrderResult } from "@/lib/payments/apply-paid-order";
import type { Json } from "@/types/supabase";

export type ReconcileResult =
  | { status: "paid"; outcome: ApplyPaidOrderResult }
  | { status: "unpaid" | "closed" | "amount_mismatch" }
  | { status: "error"; error: string };

type PaymentRef = {
  order_id: string;
  mayar_payment_id: string | null;
  mayar_transaction_id: string | null;
  gross_amount: number;
};

/**
 * Asks Mayar for the real status of a payment request and settles the order
 * when it is paid. Never trusts webhook or redirect payloads for money state.
 */
export async function reconcileMayarPayment(
  payment: PaymentRef,
  raw: Json | null = null,
): Promise<ReconcileResult> {
  if (!payment.mayar_payment_id)
    return { status: "error", error: "Pembayaran tidak terhubung ke Mayar." };

  const detail = await getMayarPayment(payment.mayar_payment_id);
  if (!detail.ok) return { status: "error", error: detail.error };

  if (detail.data.status !== "paid") {
    return { status: detail.data.status === "closed" ? "closed" : "unpaid" };
  }

  const expected = Math.round(Number(payment.gross_amount));
  if (detail.data.amount !== expected) {
    console.error("[Mayar reconcile] amount mismatch", {
      paymentId: payment.mayar_payment_id,
      expected,
      actual: detail.data.amount,
    });
    const svc = createServiceClient();
    const { data: order } = await svc
      .from("orders")
      .select("order_number")
      .eq("id", payment.order_id)
      .maybeSingle();
    await createAdminNotification({
      title: "Nominal Pembayaran Tidak Cocok",
      body: `Pesanan ${order?.order_number ?? payment.order_id}: Mayar mencatat Rp${detail.data.amount.toLocaleString("id-ID")}, seharusnya Rp${expected.toLocaleString("id-ID")}. Cek manual di dashboard Mayar.`,
      type: "payment_issue",
      data: { orderId: payment.order_id, reason: "amount_mismatch" },
    });
    return { status: "amount_mismatch" };
  }

  const transactionId = payment.mayar_transaction_id ?? detail.data.transactionIds[0] ?? null;
  let paymentType: string | null = null;
  if (transactionId) {
    const tx = await getMayarTransaction(transactionId);
    if (tx.ok) paymentType = normalizeMayarPaymentMethod(tx.data.paymentMethod);
  }

  const outcome = await applyPaidOrder({
    orderId: payment.order_id,
    paymentType,
    transactionId,
    raw,
  });
  return { status: "paid", outcome };
}
