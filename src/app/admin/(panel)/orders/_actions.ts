"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/legacy/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { getBiteshipOrder } from "@/lib/biteship/get-order";
import { confirmBiteshipOrder } from "@/lib/biteship/confirm-order";
import { cancelBiteshipOrder } from "@/lib/biteship/cancel-order";
import { closePendingMayarPayments } from "@/lib/payments/close-pending";
import { shipmentStageToNotify } from "@/lib/shipping/notify-stage";
import { getUserEmail } from "@/lib/email/get-user-email";
import { sendRefundProcessed } from "@/lib/email/send-refund-processed";
import { ORDER_STATUSES, type OrderStatus } from "./_constants";
import type { Database, Json } from "@/types/legacy-supabase";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
type TrackingHistoryEntry = { status: string; note: string; at: string };

function mapShipmentStatus(s: string): ShipmentStatus {
  switch (s.toLowerCase()) {
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

function orderStatusFromShipment(
  s: ShipmentStatus,
): Database["public"]["Enums"]["order_status"] | null {
  switch (s) {
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

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
): Promise<{ error?: string }> {
  if (!(ORDER_STATUSES as readonly string[]).includes(newStatus)) {
    return { error: "Status tidak valid." };
  }

  const supabase = await createServiceClient();

  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();

  const { error } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      ...(newStatus === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  // Notify customer on relevant status changes
  if (currentOrder?.user_id && currentOrder?.order_number) {
    const orderNum = currentOrder.order_number as string;
    const userId = currentOrder.user_id as string;
    const notifMap: Partial<Record<OrderStatus, { title: string; body: string }>> = {
      processing: {
        title: "Pesanan Diproses",
        body: `Pesanan ${orderNum} sedang diproses oleh penjual.`,
      },
      shipped: {
        title: "Pesanan Sedang Dikirim",
        body: `Pesanan ${orderNum} telah dikirim. Cek nomor resi di detail pesanan untuk melacak paket Anda.`,
      },
      delivered: {
        title: "Pesanan Telah Sampai",
        body: `Pesanan ${orderNum} telah sampai di tujuan.`,
      },
      completed: {
        title: "Pesanan Selesai",
        body: `Pesanan ${orderNum} telah selesai. Terima kasih telah berbelanja!`,
      },
      cancelled: {
        title: "Pesanan Dibatalkan",
        body: `Pesanan ${orderNum} dibatalkan oleh admin. Jika ada pertanyaan, silakan hubungi kami.`,
      },
      refunded: {
        title: "Dana Sudah Dikembalikan",
        body: `Refund untuk pesanan ${orderNum} sudah ditransfer ke rekening Anda. Dana masuk sesuai jadwal kliring bank.`,
      },
    };
    const notif = notifMap[newStatus];
    if (notif) {
      await createNotification({
        userId,
        title: notif.title,
        body: notif.body,
        type: "order_update",
        data: { order_id: orderId, order_number: orderNum, status: newStatus },
      });
    }
  }

  // Jika dibatalkan setelah pembayaran settlement, kembalikan stok & kurangi total_sold
  const prevStatus = currentOrder?.status;
  const wasAlreadyPaid = prevStatus === "paid" || prevStatus === "processing";
  if (newStatus === "cancelled" && wasAlreadyPaid) {
    const { data: items } = await supabase
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);

    if (items) {
      const productQtyMap = new Map<string, number>();

      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: v } = await supabase
          .from("product_variants")
          .select("stock, reserved, product_id")
          .eq("id", item.variant_id)
          .single();
        if (!v) continue;
        await supabase
          .from("product_variants")
          .update({
            stock: v.stock + item.quantity,
            reserved: Math.max(0, v.reserved - item.quantity),
          })
          .eq("id", item.variant_id);
        await supabase.from("stock_history").insert({
          variant_id: item.variant_id,
          order_id: orderId,
          quantity: item.quantity,
          type: "return",
          note: `Pesanan ${currentOrder?.order_number ?? orderId} dibatalkan oleh admin`,
          changed_by: null,
        });
        if (v.product_id) {
          productQtyMap.set(v.product_id, (productQtyMap.get(v.product_id) ?? 0) + item.quantity);
        }
      }

      for (const [productId, qty] of productQtyMap) {
        const { data: p } = await supabase
          .from("products")
          .select("total_sold")
          .eq("id", productId)
          .single();
        if (p) {
          await supabase
            .from("products")
            .update({ total_sold: Math.max(0, p.total_sold - qty) })
            .eq("id", productId);
        }
      }
    }
  }

  const { error: historyError } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: newStatus,
    note: note?.trim() || null,
    changed_by: null,
  });

  if (historyError) console.error("history log failed:", historyError.message);

  // Mayar: tutup link bayar pesanan yang belum dibayar. Pesanan lunas yang
  // dibatalkan di-refund manual (Mayar tidak punya API refund) — admin transfer
  // ke rekening pelanggan lalu ubah status ke "refunded".
  if (newStatus === "cancelled" && prevStatus === "pending_payment") {
    await closePendingMayarPayments(orderId);
  }

  if (newStatus === "refunded" && currentOrder?.order_number) {
    const orderNum = currentOrder.order_number as string;
    await supabase
      .from("payments")
      .update({ status: "refunded" })
      .eq("order_id", orderId)
      .eq("status", "paid");

    if (currentOrder.user_id) {
      getUserEmail(currentOrder.user_id as string)
        .then((user) => {
          if (user) {
            sendRefundProcessed({ to: user.email, name: user.name, orderNumber: orderNum }).catch(
              () => {},
            );
          }
        })
        .catch(() => {});
    }
  }

  // Biteship cancel on cancellation when shipment exists — best-effort
  if (newStatus === "cancelled") {
    const { data: shipment } = await supabase
      .from("shipments")
      .select("biteship_order_id, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (
      shipment?.biteship_order_id &&
      !["delivered", "cancelled", "returned"].includes(shipment.status ?? "")
    ) {
      const biteshipResult = await cancelBiteshipOrder(shipment.biteship_order_id);
      if (biteshipResult.ok) {
        await supabase
          .from("shipments")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("order_id", orderId);
      } else {
        console.error("[updateOrderStatus] Biteship cancel failed:", biteshipResult.error);
      }
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function syncBiteshipAWB(
  orderId: string,
): Promise<{ error?: string; awb?: string | null; status?: string }> {
  const supabase = await createServiceClient();

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, biteship_order_id, awb, status, tracking_history, picked_up_at, delivered_at")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!shipment?.biteship_order_id) {
    return { error: "Tidak ada Biteship Order ID untuk pesanan ini." };
  }

  const result = await getBiteshipOrder(shipment.biteship_order_id);
  if (!result.ok) return { error: result.error };

  const { order } = result;
  const awb = order.courier?.waybill_id ?? null;
  const rawStatus = (order.status ?? "").toLowerCase();
  const now = new Date().toISOString();

  const newShipStatus = mapShipmentStatus(rawStatus);

  // Append tracking history entry
  const history: TrackingHistoryEntry[] = Array.isArray(shipment.tracking_history)
    ? (shipment.tracking_history as unknown as TrackingHistoryEntry[])
    : [];
  const entry: TrackingHistoryEntry = { status: rawStatus, note: "Sinkronisasi manual", at: now };
  const last = history.at(-1);
  const newHistory = last && last.status === entry.status ? history : [...history, entry];

  const updatePayload: Database["public"]["Tables"]["shipments"]["Update"] = {
    tracking_history: newHistory as unknown as Json,
    updated_at: now,
  };
  if (newShipStatus !== "pending") updatePayload.status = newShipStatus;
  if (awb) updatePayload.awb = awb;
  if (order.courier?.name) updatePayload.courier_name = order.courier.name;
  if (newShipStatus === "picked" && !shipment.picked_up_at) updatePayload.picked_up_at = now;
  if (newShipStatus === "delivered" && !shipment.delivered_at) updatePayload.delivered_at = now;

  await supabase.from("shipments").update(updatePayload).eq("id", shipment.id);

  // Sync orders.status + history
  const { data: orderRow } = await supabase
    .from("orders")
    .select("id, user_id, order_number, status")
    .eq("id", orderId)
    .maybeSingle();

  const newOrderStatus = orderStatusFromShipment(newShipStatus);
  if (
    orderRow &&
    newOrderStatus &&
    orderRow.status !== newOrderStatus &&
    orderRow.status !== "completed" &&
    orderRow.status !== "cancelled"
  ) {
    await supabase
      .from("orders")
      .update({
        status: newOrderStatus,
        ...(newOrderStatus === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq("id", orderRow.id);
    await supabase.from("order_status_history").insert({
      order_id: orderRow.id,
      status: newOrderStatus,
      note: `Status diperbarui dari sinkronisasi manual Biteship: ${rawStatus}`,
      changed_by: null,
    });
  }

  // User notification — hanya saat tahap pengiriman berubah (sinkron berulang tidak spam)
  const notifyStage = shipmentStageToNotify(shipment.status, newShipStatus);
  if (orderRow?.user_id && orderRow.order_number) {
    if (notifyStage === "packing") {
      await createNotification({
        userId: orderRow.user_id,
        title: "Pesanan Sedang Dikemas",
        body: `Pesanan ${orderRow.order_number} sedang dikemas dan siap dikirim.`,
        type: "order_shipped",
        data: { orderId, awb: awb ?? undefined },
      });
    } else if (notifyStage === "in_transit") {
      await createNotification({
        userId: orderRow.user_id,
        title: "Pesanan Dalam Perjalanan",
        body: `Pesanan ${orderRow.order_number} sedang dalam perjalanan ke alamatmu.`,
        type: "order_in_transit",
        data: { orderId, awb: awb ?? undefined },
      });
    } else if (notifyStage === "delivered") {
      await createNotification({
        userId: orderRow.user_id,
        title: "Pesanan Telah Sampai",
        body: `Pesanan ${orderRow.order_number} telah sampai di tujuan. Jangan lupa beri ulasan!`,
        type: "order_delivered",
        data: { orderId },
      });
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/dashboard/orders`);

  return { awb, status: newShipStatus };
}

export async function updateOrderAWB(orderId: string, awb: string): Promise<{ error?: string }> {
  const trimmed = awb.trim();
  if (!trimmed) return { error: "Nomor AWB tidak boleh kosong." };

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("shipments")
      .update({ awb: trimmed })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { data: order } = await supabase
      .from("orders")
      .select("courier_company, courier_service")
      .eq("id", orderId)
      .single();

    const { error } = await supabase.from("shipments").insert({
      order_id: orderId,
      awb: trimmed,
      courier_company: order?.courier_company ?? "manual",
      courier_service: order?.courier_service ?? "manual",
      status: "confirmed",
    });
    if (error) return { error: error.message };
  }

  // Auto-advance to shipped if still processing
  const { data: orderData } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();

  if (orderData?.status === "processing") {
    await supabase.from("orders").update({ status: "shipped" }).eq("id", orderId);
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "shipped",
      note: `AWB diinput manual: ${trimmed}`,
      changed_by: null,
    });
    if (orderData.user_id && orderData.order_number) {
      await createNotification({
        userId: orderData.user_id as string,
        title: "Pesanan Sedang Dikirim",
        body: `Pesanan ${orderData.order_number} telah dikirim. Lacak paket Anda dengan nomor resi ${trimmed}.`,
        type: "order_update",
        data: {
          order_id: orderId,
          order_number: orderData.order_number,
          status: "shipped",
          awb: trimmed,
        },
      });
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function confirmReadyForPickup(
  orderId: string,
): Promise<{ error?: string; awb?: string | null }> {
  const supabase = await createServiceClient();

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, status, biteship_order_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!shipment?.biteship_order_id) {
    return { error: "Tidak ada Biteship Order ID untuk pesanan ini." };
  }
  if (shipment.status !== "pending") {
    return { error: "Pesanan sudah dikonfirmasi atau sedang diproses kurir." };
  }

  // Konfirmasi ke Biteship API agar kurir dijadwalkan untuk pickup
  const confirmResult = await confirmBiteshipOrder(shipment.biteship_order_id);
  if (!confirmResult.ok) {
    return { error: `Gagal konfirmasi ke Biteship: ${confirmResult.error}` };
  }

  // Waybill terbit saat konfirmasi (sebelum kurir dialokasikan). Kalau tidak ikut
  // di response confirm, ambil dari detail order supaya resi bisa langsung dicetak.
  let awb = confirmResult.waybillId;
  if (!awb) {
    const detail = await getBiteshipOrder(shipment.biteship_order_id);
    if (detail.ok) awb = detail.order.courier?.waybill_id ?? null;
  }

  await supabase
    .from("shipments")
    .update({
      status: "confirmed",
      ...(awb ? { awb } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", shipment.id);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: "processing",
    note: awb
      ? `Admin mengonfirmasi paket siap pickup. Nomor resi: ${awb}. Menunggu kurir.`
      : "Admin mengonfirmasi paket siap pickup. Menunggu kurir.",
    changed_by: null,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return { awb };
}
