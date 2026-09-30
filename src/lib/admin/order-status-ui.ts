/** Badge kelas Tailwind untuk status pesanan — selaras admin (brand / muted / emerald / destructive). */

export const ADMIN_ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Tiba di tujuan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
};

export function adminOrderStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending_payment":
      return "bg-brand/10 text-brand";
    case "paid":
    case "processing":
    case "shipped":
      return "bg-muted text-foreground";
    case "delivered":
      return "bg-emerald-500/10 text-emerald-800";
    case "completed":
      return "bg-emerald-500/15 text-emerald-800";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    case "refunded":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
