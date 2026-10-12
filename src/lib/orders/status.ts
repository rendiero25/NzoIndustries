/**
 * Label & pengelompokan status pesanan/after-sales untuk UI (Bahasa Indonesia).
 * Satu sumber dipakai dashboard user (Fase 7) dan admin (Fase 8).
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "awaiting_verification",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: "Belum bayar", tone: "warning" },
  awaiting_verification: { label: "Menunggu verifikasi", tone: "warning" },
  paid: { label: "Dibayar", tone: "info" },
  processing: { label: "Diproses", tone: "info" },
  shipped: { label: "Dikirim", tone: "info" },
  delivered: { label: "Diterima", tone: "success" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "danger" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  refunded: { label: "Dikembalikan", tone: "neutral" },
};

export function orderStatusMeta(status: string): { label: string; tone: StatusTone } {
  return ORDER_STATUS_META[status as OrderStatus] ?? { label: status, tone: "neutral" };
}

/** Tab filter daftar pesanan user. */
export const ORDER_TABS = [
  { key: "all", label: "Semua", statuses: null },
  { key: "unpaid", label: "Belum bayar", statuses: ["pending_payment", "awaiting_verification"] },
  { key: "processing", label: "Diproses", statuses: ["paid", "processing"] },
  { key: "shipped", label: "Dikirim", statuses: ["shipped", "delivered"] },
  { key: "completed", label: "Selesai", statuses: ["completed"] },
  { key: "cancelled", label: "Dibatalkan", statuses: ["cancelled", "expired", "refunded"] },
] as const satisfies readonly {
  key: string;
  label: string;
  statuses: readonly OrderStatus[] | null;
}[];

export type OrderTabKey = (typeof ORDER_TABS)[number]["key"];

export function orderTab(key: string | undefined): (typeof ORDER_TABS)[number] {
  return ORDER_TABS.find((t) => t.key === key) ?? ORDER_TABS[0];
}

export const RETURN_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  requested: { label: "Diajukan", tone: "warning" },
  approved: { label: "Disetujui", tone: "info" },
  rejected: { label: "Ditolak", tone: "danger" },
  item_shipped: { label: "Barang dikirim balik", tone: "info" },
  item_received: { label: "Barang diterima toko", tone: "info" },
  refunded: { label: "Dana dikembalikan", tone: "success" },
  completed: { label: "Selesai", tone: "success" },
};

export const CLAIM_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  submitted: { label: "Diajukan", tone: "warning" },
  in_review: { label: "Diperiksa", tone: "info" },
  approved: { label: "Disetujui", tone: "success" },
  rejected: { label: "Ditolak", tone: "danger" },
  resolved: { label: "Selesai", tone: "success" },
};

export const REVIEW_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Menunggu moderasi", tone: "warning" },
  published: { label: "Tayang", tone: "success" },
  hidden: { label: "Disembunyikan", tone: "neutral" },
};

/** Masih dalam jendela retur (D-36)? `receivedAt` = waktu diterima. */
export function withinReturnWindow(
  receivedAt: Date,
  windowDays: number,
  now = new Date(),
): boolean {
  return receivedAt.getTime() + windowDays * 86_400_000 > now.getTime();
}
