import "server-only";

/**
 * @deprecated Klien Mayar pindah ke `@/lib/payments/mayar` (Fase 6). File ini
 * hanya menjaga import admin legacy (`lib/payments/close-pending`) sampai
 * ditulis ulang di Fase 8.
 */
export {
  closeMayarPayment,
  createMayarPayment,
  getMayarPayment,
  getMayarTransaction,
  type MayarCreatedPayment,
  type MayarPaymentDetail,
  type MayarResult,
  type MayarTransactionDetail,
} from "@/lib/payments/mayar";
export { normalizeMayarPaymentMethod } from "@/lib/payments/mayar-method";
