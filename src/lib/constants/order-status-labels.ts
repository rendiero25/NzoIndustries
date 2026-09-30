import type { Database } from "@/types/supabase";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

const LABELS: Record<OrderStatus, string> = {
  pending_payment: "Menunggu Pembayaran",
  paid: "Pembayaran Dikonfirmasi",
  processing: "Pesanan Diproses",
  shipped: "Paket Dikirim",
  delivered: "Paket Tiba",
  completed: "Pesanan Selesai",
  cancelled: "Pesanan Dibatalkan",
  refunded: "Dana Dikembalikan",
};

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status] ?? status;
}

export const ORDER_STATUS_FILTER_OPTIONS: { value: "" | OrderStatus; label: string }[] = [
  { value: "", label: "Semua status" },
  { value: "pending_payment", label: LABELS.pending_payment },
  { value: "paid", label: LABELS.paid },
  { value: "processing", label: LABELS.processing },
  { value: "shipped", label: LABELS.shipped },
  { value: "delivered", label: LABELS.delivered },
  { value: "completed", label: LABELS.completed },
  { value: "cancelled", label: LABELS.cancelled },
  { value: "refunded", label: LABELS.refunded },
];
