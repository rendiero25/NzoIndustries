import "server-only";

import { providerForRef } from "@/lib/payments/provider";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Satu-satunya jalur pelunasan (webhook, cek status user, simulator).
 * Status & nominal SELALU ditanyakan ulang ke provider; payload webhook atau
 * redirect tidak pernah dipercaya untuk uang. RPC `mark_order_paid` idempotent.
 */
export type SettleOutcome =
  | "settled"
  | "already_paid"
  | "amount_mismatch"
  | "paid_after_cancel"
  | "not_found"
  | "unpaid"
  | "closed"
  | "error";

async function notifyStaff(title: string, body: string, link: string | null) {
  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["owner", "admin"])
    .is("deleted_at", null);
  if (!staff?.length) return;
  await admin
    .from("notifications")
    .insert(staff.map((s) => ({ user_id: s.id, type: "payment_issue", title, body, link })));
}

export async function settlePayment(paymentId: string): Promise<SettleOutcome> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, provider_ref, status, amount, order:orders(order_number)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment?.provider_ref) return "not_found";
  if (payment.status === "paid") return "already_paid";

  const provider = providerForRef(payment.provider_ref);
  if (!provider) return "error";
  const status = await provider.getStatus(payment.provider_ref);
  if (!status.ok) return "error";
  if (status.data.status !== "paid") return status.data.status;

  const { data, error } = await admin.rpc("mark_order_paid", {
    p_payment_id: payment.id,
    p_amount: status.data.amount,
    p_method: status.data.method ?? undefined,
    p_transaction_ref: status.data.transactionRef ?? undefined,
  });
  if (error) {
    console.error("[settle] mark_order_paid", error.code);
    return "error";
  }

  const outcome = data as SettleOutcome;
  const orderNumber = payment.order?.order_number ?? payment.id;
  if (outcome === "amount_mismatch") {
    await notifyStaff(
      "Nominal pembayaran tidak cocok",
      `Pesanan ${orderNumber}: provider mencatat Rp${status.data.amount.toLocaleString("id-ID")}, seharusnya Rp${Number(payment.amount).toLocaleString("id-ID")}. Cek manual di dashboard Mayar.`,
      null,
    );
  } else if (outcome === "paid_after_cancel") {
    await notifyStaff(
      "Pembayaran masuk untuk pesanan yang sudah batal",
      `Pesanan ${orderNumber} sudah expired/batal saat pembayaran diterima. Proses refund atau aktifkan ulang.`,
      null,
    );
  }
  return outcome;
}
