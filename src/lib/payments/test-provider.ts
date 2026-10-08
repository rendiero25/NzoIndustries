import "server-only";

import { randomUUID } from "node:crypto";

import type { PaymentProvider } from "@/lib/payments/provider";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Simulator pembayaran (D-32): tanpa API eksternal. "Sisi provider" disimpan
 * di baris `payments` sendiri: simulasi bayar berhasil mengisi
 * `transaction_ref` berawalan SIM-, lalu jalur pelunasan yang sama dengan
 * webhook (settlePayment) membaca status dari sini.
 */
export const TEST_REF_PREFIX = "TEST-";
export const SIMULATED_TX_PREFIX = "SIM-";

export const testPaymentProvider: PaymentProvider = {
  name: "test",

  async createPayment(input) {
    const ref = `${TEST_REF_PREFIX}${randomUUID()}`;
    return {
      ok: true,
      data: {
        ref,
        checkoutUrl: `/checkout/pay-test/${encodeURIComponent(ref)}`,
        expiresAt: input.expiresAt.toISOString(),
      },
    };
  },

  async getStatus(ref) {
    const { data } = await createAdminClient()
      .from("payments")
      .select("amount, status, transaction_ref")
      .eq("provider_ref", ref)
      .maybeSingle();
    if (!data) return { ok: false, error: "Pembayaran uji tidak ditemukan." };
    const simulated = data.transaction_ref?.startsWith(SIMULATED_TX_PREFIX) ?? false;
    return {
      ok: true,
      data: {
        status:
          simulated || data.status === "paid"
            ? "paid"
            : data.status === "pending"
              ? "unpaid"
              : "closed",
        amount: Number(data.amount),
        method: simulated ? "simulator" : null,
        transactionRef: data.transaction_ref,
      },
    };
  },

  verifyWebhook() {
    return false;
  },

  async close() {},
};
