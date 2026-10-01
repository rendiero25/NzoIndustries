import { createServiceClient } from "@/lib/supabase/legacy/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { getUserEmail } from "@/lib/email/get-user-email";
import { sendOrderShipped } from "@/lib/email/send-order-shipped";
import { sendOrderDelivered } from "@/lib/email/send-order-delivered";
import { shipmentStageToNotify } from "@/lib/shipping/notify-stage";
import type { Database, Json } from "@/types/legacy-supabase";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

/**
 * Biteship webhook payload — FLAT shape (verified dari event live):
 *   { event, order_id, status, courier_waybill_id, courier_company, courier_type,
 *     courier_tracking_id, courier_link, courier_driver_name, courier_driver_phone,
 *     courier_driver_plate_number, updated_at, ... }
 * Varian nested lama (courier.*) didukung sebagai fallback.
 */
type BiteshipWebhookBody = {
  event?: string;
  order_id?: string;
  status?: string;
  updated_at?: string;
  courier_waybill_id?: string;
  courier_company?: string;
  courier_tracking_id?: string;
  courier_link?: string;
  courier_driver_name?: string;
  courier_driver_phone?: string;
  courier?: {
    waybill_id?: string;
    name?: string;
    tracking_id?: string;
    link?: string;
  };
};

/** 1 entri timeline yang disimpan ke shipments.tracking_history (oldest → newest). */
type TrackingHistoryEntry = {
  status: string; // status mentah Biteship (lowercase) — granular utk tampilan
  note: string; // detail kurir/driver bila ada
  at: string; // ISO timestamp
};

// Map status Biteship → enum shipment_status kita (1:1 bila ada).
function mapShipmentStatus(biteshipStatus: string): ShipmentStatus {
  switch (biteshipStatus.toLowerCase()) {
    case "confirmed":
      return "confirmed";
    case "allocated":
      return "allocated";
    case "picking_up":
      return "picking_up";
    case "picked":
      return "picked";
    case "dropping_off":
      return "dropping_off";
    case "delivered":
      return "delivered";
    case "rejected":
      return "rejected";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "return":
    case "returned":
      return "returned";
    default:
      return "pending";
  }
}

// Map shipment status → order status.
function orderStatusFromShipment(shipmentStatus: ShipmentStatus): OrderStatus | null {
  switch (shipmentStatus) {
    case "confirmed":
    case "allocated":
    case "picking_up":
    case "picked":
    case "dropping_off":
      return "shipped";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

export async function POST(req: Request) {
  try {
    // ── Parse body dulu — installation ping Biteship harus 200 sebelum validasi apapun ──
    let body: BiteshipWebhookBody;
    try {
      body = (await req.json()) as BiteshipWebhookBody;
    } catch {
      return Response.json({ ok: true });
    }

    // Installation ping: body kosong atau tidak ada order_id/status
    const biteshipOrderId = body.order_id;
    const rawStatus = (body.status ?? "").toLowerCase();
    if (!biteshipOrderId || !rawStatus) {
      return Response.json({ ok: true });
    }

    // ── Verifikasi secret (hanya untuk payload aktual, bukan ping) ──
    const secret = process.env.BITESHIP_WEBHOOK_SECRET?.trim();
    if (secret) {
      const token = new URL(req.url).searchParams.get("token");
      if (token !== secret) {
        return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const svc = createServiceClient();

    const newShipStatus = mapShipmentStatus(rawStatus);
    const awb = body.courier_waybill_id ?? body.courier?.waybill_id ?? null;
    const courierName = body.courier_driver_name ?? body.courier?.name ?? null;
    const at = body.updated_at ?? new Date().toISOString();

    const { data: shipment } = await svc
      .from("shipments")
      .select("id, order_id, status, tracking_history")
      .eq("biteship_order_id", biteshipOrderId)
      .maybeSingle();

    if (!shipment) {
      // Not a regular order shipment — this Biteship order may be a return/replacement
      // shipment instead (tracked in return_shipments, a separate table).
      const { data: returnShipment } = await svc
        .from("return_shipments")
        .select("id, return_id")
        .eq("biteship_order_id", biteshipOrderId)
        .maybeSingle();

      if (!returnShipment) {
        return Response.json({ ok: true }); // unknown order, silently accept
      }

      const returnShipmentUpdate: Database["public"]["Tables"]["return_shipments"]["Update"] = {
        status: newShipStatus,
      };
      if (awb) returnShipmentUpdate.awb_number = awb;
      await svc.from("return_shipments").update(returnShipmentUpdate).eq("id", returnShipment.id);

      if (newShipStatus === "delivered") {
        const { data: returnRow } = await svc
          .from("returns")
          .select("id, user_id, order_id")
          .eq("id", returnShipment.return_id)
          .maybeSingle();

        if (returnRow) {
          await svc
            .from("returns")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", returnRow.id);

          await createNotification({
            userId: returnRow.user_id,
            title: "Retur Selesai",
            body: "Produk pengganti telah sampai di tujuan. Terima kasih atas kesabarannya!",
            type: "return_completed",
            data: { returnId: returnRow.id, orderId: returnRow.order_id },
          });
        }
      }

      return Response.json({ ok: true });
    }

    // ── Append ke tracking_history (dedup entri identik terakhir) ──
    const history: TrackingHistoryEntry[] = Array.isArray(shipment.tracking_history)
      ? (shipment.tracking_history as unknown as TrackingHistoryEntry[])
      : [];
    const note = [body.courier_driver_name, body.courier_driver_phone].filter(Boolean).join(" · ");
    const entry: TrackingHistoryEntry = { status: rawStatus, note, at };
    const last = history.at(-1);
    const newHistory =
      last && last.status === entry.status && last.at === entry.at ? history : [...history, entry];

    const updatePayload: Database["public"]["Tables"]["shipments"]["Update"] = {
      tracking_history: newHistory as unknown as Json,
      updated_at: new Date().toISOString(),
    };
    // Hanya ubah status kalau dikenali (jangan downgrade ke pending utk status tak dikenal).
    if (newShipStatus !== "pending") updatePayload.status = newShipStatus;
    if (awb) updatePayload.awb = awb;
    if (courierName) updatePayload.courier_name = courierName;
    if (newShipStatus === "picked") updatePayload.picked_up_at = at;
    if (newShipStatus === "delivered") updatePayload.delivered_at = at;

    await svc.from("shipments").update(updatePayload).eq("id", shipment.id);

    const { data: orderRow } = await svc
      .from("orders")
      .select("id, user_id, order_number, status")
      .eq("id", shipment.order_id)
      .maybeSingle();

    // ── Sync order status + riwayat ──
    const newOrderStatus = orderStatusFromShipment(newShipStatus);
    if (
      orderRow &&
      newOrderStatus &&
      orderRow.status !== newOrderStatus &&
      orderRow.status !== "completed" &&
      orderRow.status !== "cancelled"
    ) {
      await svc
        .from("orders")
        .update({
          status: newOrderStatus,
          ...(newOrderStatus === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
        })
        .eq("id", orderRow.id);
      await svc.from("order_status_history").insert({
        order_id: orderRow.id,
        status: newOrderStatus,
        note: `Status diperbarui otomatis dari Biteship: ${rawStatus}`,
        changed_by: null,
      });
    }

    // ── Notifikasi user ──
    const notifyStage = shipmentStageToNotify(shipment.status, newShipStatus);
    if (orderRow?.user_id && orderRow.order_number) {
      if (notifyStage === "packing") {
        await createNotification({
          userId: orderRow.user_id,
          title: "Pesanan Sedang Dikemas",
          body: `Pesanan ${orderRow.order_number} sedang dikemas dan siap dikirim.`,
          type: "order_shipped",
          data: { orderId: shipment.order_id, awb: awb ?? undefined },
        });
      } else if (notifyStage === "in_transit") {
        await createNotification({
          userId: orderRow.user_id,
          title: "Pesanan Dalam Perjalanan",
          body: `Pesanan ${orderRow.order_number} sedang dalam perjalanan ke alamatmu.`,
          type: "order_in_transit",
          data: { orderId: shipment.order_id, awb: awb ?? undefined },
        });
      } else if (notifyStage === "delivered") {
        await createNotification({
          userId: orderRow.user_id,
          title: "Pesanan Telah Sampai",
          body: `Pesanan ${orderRow.order_number} telah sampai di tujuan. Jangan lupa beri ulasan!`,
          type: "order_delivered",
          data: { orderId: shipment.order_id },
        });
      }

      // Email: kirim saat picking_up/picked/dropping_off (idempotency key cegah duplikat)
      if (
        newShipStatus === "picking_up" ||
        newShipStatus === "picked" ||
        newShipStatus === "dropping_off"
      ) {
        getUserEmail(orderRow.user_id)
          .then((user) => {
            if (user) {
              sendOrderShipped({
                to: user.email,
                name: user.name,
                orderNumber: orderRow.order_number!,
                orderId: orderRow.id,
                awb: awb ?? undefined,
                courierCompany: body.courier_company ?? undefined,
                trackingUrl: body.courier_link ?? undefined,
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }

      if (newShipStatus === "delivered") {
        getUserEmail(orderRow.user_id)
          .then((user) => {
            if (user) {
              sendOrderDelivered({
                to: user.email,
                name: user.name,
                orderNumber: orderRow.order_number!,
                orderId: orderRow.id,
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
