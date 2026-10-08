"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { isTestPaymentMode } from "@/lib/payments/provider";
import { settlePayment, type SettleOutcome } from "@/lib/payments/settle";
import { startPayment } from "@/lib/payments/start";
import { SIMULATED_TX_PREFIX, TEST_REF_PREFIX } from "@/lib/payments/test-provider";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const orderSchema = z.object({ orderNumber: z.string().regex(/^NZO-\d{6}-[0-9A-F]{6}$/) });

type OwnOrder = { id: string; order_number: string; status: string };

/** Pesanan milik user login (RLS `orders_select_own`). */
async function ownOrder(orderNumber: string, userId: string): Promise<OwnOrder | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("order_number", orderNumber)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export type PayOrderResult = { ok: true; checkoutUrl: string } | { ok: false; error: string };

/** Link bayar Mayar untuk pesanan pending (pakai ulang link yang masih berlaku). */
export async function payOrder(input: { orderNumber: string }): Promise<PayOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pesanan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("checkout", user.id))) {
    return { ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar." };
  }
  const order = await ownOrder(parsed.data.orderNumber, user.id);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  return startPayment(order.id, { id: user.id, email: user.email });
}

export type RefreshPaymentResult =
  { ok: true; status: string; outcome: SettleOutcome | null } | { ok: false; error: string };

/**
 * Cek ulang status ke provider (mis. user kembali dari Mayar sebelum webhook
 * tiba). Pelunasan tetap lewat settlePayment.
 */
export async function refreshPaymentStatus(input: {
  orderNumber: string;
}): Promise<RefreshPaymentResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pesanan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("paymentStatus", user.id))) {
    return { ok: false, error: "Terlalu sering. Coba lagi sebentar lagi." };
  }
  const order = await ownOrder(parsed.data.orderNumber, user.id);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (order.status !== "pending_payment") return { ok: true, status: order.status, outcome: null };

  const { data: payment } = await createAdminClient()
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .eq("status", "pending")
    .maybeSingle();
  if (!payment) return { ok: true, status: order.status, outcome: null };

  const outcome = await settlePayment(payment.id);
  const fresh = await ownOrder(parsed.data.orderNumber, user.id);
  if (outcome === "settled") revalidatePath("/checkout/success");
  return { ok: true, status: fresh?.status ?? order.status, outcome };
}

/**
 * Simulator (D-32): tandai pembayaran uji berhasil, lalu lunasi lewat jalur
 * yang sama dengan webhook. Ditolak bila bukan mode uji atau bukan milik user.
 */
export async function simulateTestPayment(input: {
  ref: string;
  result: "paid" | "cancel";
}): Promise<
  { ok: true; orderNumber: string; outcome: SettleOutcome | null } | { ok: false; error: string }
> {
  if (!isTestPaymentMode()) return { ok: false, error: "Simulator tidak aktif." };
  const parsed = z
    .object({
      ref: z.string().startsWith(TEST_REF_PREFIX).max(80),
      result: z.enum(["paid", "cancel"]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pembayaran uji tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, order:orders(order_number, user_id)")
    .eq("provider_ref", parsed.data.ref)
    .maybeSingle();
  if (!payment || payment.order?.user_id !== user.id) {
    return { ok: false, error: "Pembayaran uji tidak ditemukan." };
  }
  const orderNumber = payment.order.order_number;
  if (parsed.data.result === "cancel" || payment.status !== "pending") {
    return { ok: true, orderNumber, outcome: null };
  }

  await admin
    .from("payments")
    .update({ transaction_ref: `${SIMULATED_TX_PREFIX}${crypto.randomUUID()}` })
    .eq("id", payment.id)
    .eq("status", "pending");
  const outcome = await settlePayment(payment.id);
  return { ok: true, orderNumber, outcome };
}
