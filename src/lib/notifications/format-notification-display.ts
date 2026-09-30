const TYPE_LABELS: Record<string, string> = {
  order_placed: "Pesanan",
  order_update: "Pesanan",
  order_cancelled: "Pesanan",
  order_shipped: "Pengiriman",
  order_in_transit: "Pengiriman",
  order_delivered: "Pengiriman",
  payment_confirmed: "Pembayaran",
  payment_pending: "Pembayaran",
  payment_failed: "Pembayaran",
  payment_refunded: "Pembayaran",
  payment_issue: "Pembayaran",
  payment_expired: "Pembayaran",
  welcome: "Akun",
};

export function getNotificationTypeLabel(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  if (type.startsWith("payment_")) return "Pembayaran";
  if (type.startsWith("order_")) return "Pesanan";
  return "Info";
}

type NotifDisplayInput = {
  type: string;
  title: string;
  body: string;
};

export function formatNotificationBody(notif: NotifDisplayInput): string {
  const body = notif.body.trim();
  if (!body) return "";

  if (body === notif.title.trim()) return "";

  return body.length > 140 ? `${body.slice(0, 137)}…` : body;
}
