/**
 * Tahap pengiriman yang memicu notifikasi ke pelanggan. Beberapa status Biteship
 * masuk tahap yang sama (picking_up & picked = "dikemas"), jadi notifikasi hanya
 * dikirim saat tahapnya berubah — bukan setiap webhook / sinkron manual.
 */
export type ShipmentNotifyStage = "packing" | "in_transit" | "delivered";

export function shipmentNotifyStage(status: string | null | undefined): ShipmentNotifyStage | null {
  switch (status) {
    case "picking_up":
    case "picked":
      return "packing";
    case "dropping_off":
      return "in_transit";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

/** Tahap baru yang perlu dinotifikasi, atau null kalau tahapnya sama dengan sebelumnya. */
export function shipmentStageToNotify(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): ShipmentNotifyStage | null {
  const next = shipmentNotifyStage(nextStatus);
  if (!next || next === shipmentNotifyStage(previousStatus)) return null;
  return next;
}
