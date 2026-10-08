import "server-only";

import { getServerEnv } from "@/lib/env";
import { mayarProvider } from "@/lib/payments/mayar";
import { TEST_REF_PREFIX, testPaymentProvider } from "@/lib/payments/test-provider";

/**
 * Lapisan pembayaran (D-08). Saat ini hanya Mayar (D-31); simulator dev
 * (D-32) aktif bila MAYAR_API_KEY kosong dan PAYMENT_TEST_MODE=true.
 * Status dari provider selalu ditanyakan ulang, tidak dari payload client/webhook.
 */
export type PaymentResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type CreatePaymentInput = {
  orderNumber: string;
  amount: number;
  description: string;
  customer: { name: string; email: string; phone: string };
  expiresAt: Date;
  returnUrl: string;
};

export type CreatedPayment = {
  ref: string;
  checkoutUrl: string;
  expiresAt: string | null;
};

export type ProviderPaymentStatus = {
  status: "paid" | "unpaid" | "closed";
  amount: number;
  method: string | null;
  transactionRef: string | null;
};

export interface PaymentProvider {
  readonly name: "mayar" | "test";
  createPayment(input: CreatePaymentInput): Promise<PaymentResult<CreatedPayment>>;
  getStatus(ref: string): Promise<PaymentResult<ProviderPaymentStatus>>;
  verifyWebhook(headers: Headers): boolean;
  close(ref: string): Promise<void>;
}

export function isTestPaymentMode(): boolean {
  const env = getServerEnv();
  return !env.MAYAR_API_KEY && env.PAYMENT_TEST_MODE === "true";
}

/** Provider untuk pembayaran baru. null = pembayaran belum dikonfigurasi. */
export function getPaymentProvider(): PaymentProvider | null {
  if (getServerEnv().MAYAR_API_KEY) return mayarProvider;
  if (isTestPaymentMode()) return testPaymentProvider;
  return null;
}

/** Provider pemilik `ref` tertentu (link simulator diberi prefix khusus). */
export function providerForRef(ref: string): PaymentProvider | null {
  if (ref.startsWith(TEST_REF_PREFIX)) return isTestPaymentMode() ? testPaymentProvider : null;
  return getServerEnv().MAYAR_API_KEY ? mayarProvider : null;
}

export const PAYMENT_NOT_CONFIGURED =
  "Pembayaran online belum tersedia. Hubungi kami lewat WhatsApp.";
