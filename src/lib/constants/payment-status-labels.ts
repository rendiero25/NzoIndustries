import type { Database } from "@/types/supabase";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const LABELS: Record<PaymentStatus, string> = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  challenge: "Challenge",
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return LABELS[status] ?? status;
}
