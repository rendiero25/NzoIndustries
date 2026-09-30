import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import {
  ON_DEMAND_COURIERS,
  parseOriginCoords,
  resolveOnDemandCoords,
} from "@/lib/shipping/on-demand-coords";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import { getUserEmail } from "@/lib/email/get-user-email";
import { sendPaymentConfirmed } from "@/lib/email/send-payment-confirmed";
import { sendLowStockAlert } from "@/lib/email/send-low-stock-alert";
import type { Json } from "@/types/supabase";

export type ApplyPaidOrderResult = "settled" | "already_paid" | "paid_after_cancel" | "not_found";

/**
 * Marks an order as paid after the gateway confirmed settlement.
 * Shared by the Mayar webhook and the manual verify-payment route.
 *
 * Idempotent: the pending_payment -> paid transition is claimed atomically, so
 * only one caller runs the side effects (stock, emails, Biteship shipment).
 */
export async function applyPaidOrder(params: {
  orderId: string;
  paymentType: string | null;
  transactionId: string | null;
  raw: Json | null;
}): Promise<ApplyPaidOrderResult> {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, user_id, total")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order) return "not_found";

  // Record the payment first so admin sees money arrived even if the order was
  // already cancelled (expired window, customer cancel) and needs a manual refund.
  await svc
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(params.transactionId ? { mayar_transaction_id: params.transactionId } : {}),
      ...(params.paymentType ? { payment_type: params.paymentType } : {}),
      raw_response: params.raw,
    })
    .eq("order_id", order.id)
    .neq("status", "paid");

  const { data: claimed } = await svc
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    if (order.status !== "cancelled") return "already_paid";

    await svc.from("order_status_history").insert({
      order_id: order.id,
      status: "cancelled",
      note: "Pembayaran Mayar masuk setelah pesanan dibatalkan — perlu refund manual atau pemulihan pesanan.",
      changed_by: null,
    });
    await createAdminNotification({
      title: "Pembayaran Masuk untuk Pesanan Batal",
      body: `Pesanan ${order.order_number} sudah dibatalkan tapi pembayaran Rp${order.total.toLocaleString("id-ID")} diterima Mayar. Lakukan refund manual.`,
      type: "payment_issue",
      data: { orderId: order.id, orderNumber: order.order_number, reason: "paid_after_cancel" },
    });
    return "paid_after_cancel";
  }

  const orderNumber = order.order_number;

  await svc.from("order_status_history").insert({
    order_id: order.id,
    status: "paid",
    note: `Pembayaran dikonfirmasi via Mayar${params.paymentType ? ` (${params.paymentType})` : ""}`,
    changed_by: null,
  });

  if (order.user_id) {
    await createNotification({
      userId: order.user_id,
      title: "Pembayaran Dikonfirmasi",
      body: `Pembayaran untuk pesanan ${orderNumber} berhasil dikonfirmasi. Pesanan sedang diproses.`,
      type: "payment_confirmed",
      data: { orderId: order.id, orderNumber },
    });

    getUserEmail(order.user_id)
      .then((user) => {
        if (user) {
          sendPaymentConfirmed({
            to: user.email,
            name: user.name,
            orderNumber,
            orderId: order.id,
            total: order.total,
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  await createAdminNotification({
    title: "Pembayaran Diterima",
    body: `Pesanan ${orderNumber} telah dibayar. Siap untuk diproses.`,
    type: "payment_confirmed",
    data: { orderId: order.id, orderNumber },
  });

  // Deduct stock and clear reservation
  const { data: items } = await svc
    .from("order_items")
    .select("variant_id, quantity, product_name, variant_name, sku")
    .eq("order_id", order.id);

  if (items) {
    const productQtyMap = new Map<string, number>();

    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: v } = await svc
        .from("product_variants")
        .select("stock, reserved, product_id")
        .eq("id", item.variant_id)
        .single();
      if (!v) continue;
      const newStock = Math.max(0, v.stock - item.quantity);
      await svc
        .from("product_variants")
        .update({
          stock: newStock,
          reserved: Math.max(0, v.reserved - item.quantity),
        })
        .eq("id", item.variant_id);
      if (newStock <= 5) {
        await createAdminNotification({
          title: "Stok Menipis",
          body: `Variant ${item.variant_id} tersisa ${newStock} unit setelah pesanan ${orderNumber}.`,
          type: "low_stock",
          data: { variantId: item.variant_id, stock: newStock, orderId: order.id },
        });
        sendLowStockAlert({
          productName: item.product_name,
          variantName: item.variant_name,
          sku: item.sku ?? null,
          stock: newStock,
          orderNumber,
        }).catch(() => {});
      }
      await svc.from("stock_history").insert({
        variant_id: item.variant_id,
        order_id: order.id,
        quantity: -item.quantity,
        type: "sale",
        note: `Pesanan ${orderNumber} settlement`,
        changed_by: null,
      });
      if (v.product_id) {
        productQtyMap.set(v.product_id, (productQtyMap.get(v.product_id) ?? 0) + item.quantity);
      }
    }

    for (const [productId, qty] of productQtyMap) {
      const { data: p } = await svc
        .from("products")
        .select("total_sold")
        .eq("id", productId)
        .single();
      if (p) {
        await svc
          .from("products")
          .update({ total_sold: p.total_sold + qty })
          .eq("id", productId);
      }
    }
  }

  // Create Biteship shipment — only on first settlement transition
  const { data: existingShipment } = await svc
    .from("shipments")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();

  if (!existingShipment) {
    const [{ data: orderFull }, { data: settingsRow }] = await Promise.all([
      svc
        .from("orders")
        .select(
          "courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal, shipping_lat, shipping_lng",
        )
        .eq("id", order.id)
        .single(),
      svc.from("settings").select("value").eq("key", "store_origin").maybeSingle(),
    ]);
    const storeOrigin = (settingsRow?.value ?? null) as { lat?: string; lng?: string } | null;

    if (orderFull?.courier_company && orderFull.courier_service) {
      const { data: orderItems } = await svc
        .from("order_items")
        .select("product_name, price, quantity, weight")
        .eq("order_id", order.id);

      if (orderItems?.length) {
        const postalNum = parseInt(orderFull.shipping_postal.replace(/\D/g, ""), 10);
        const onDemandCoords = await resolveOnDemandCoords(
          orderFull.courier_company,
          postalNum,
          storeOrigin,
          {
            lat: orderFull.shipping_lat,
            lng: orderFull.shipping_lng,
          },
        );
        const shipResult = await createBiteshipOrder({
          destinationName: orderFull.recipient_name,
          destinationPhone: orderFull.recipient_phone,
          destinationAddress: orderFull.shipping_address,
          destinationPostalCode: postalNum,
          courierCompany: orderFull.courier_company,
          courierType: orderFull.courier_service,
          items: orderItems.map((i) => ({
            name: i.product_name,
            value: i.price,
            quantity: i.quantity,
            weight: Math.round(i.weight / i.quantity),
          })),
          orderNote: `NZO Industries Order ${orderNumber}`,
          ...onDemandCoords,
        });

        if (shipResult.ok) {
          await svc.from("shipments").insert({
            order_id: order.id,
            courier_company: orderFull.courier_company,
            courier_name: shipResult.courierName,
            courier_service: orderFull.courier_service,
            biteship_order_id: shipResult.biteshipOrderId,
            awb: shipResult.awb,
            status: "pending",
          });
        } else {
          const isOnDemand = ON_DEMAND_COURIERS.has(orderFull.courier_company.toLowerCase());
          const hasOriginCoords = parseOriginCoords(storeOrigin) !== null;
          const coordHint =
            isOnDemand && !hasOriginCoords
              ? " (Koordinat origin belum dikonfigurasi — isi Latitude & Longitude di Admin → Pengaturan → Pengiriman)"
              : "";
          await svc.from("order_status_history").insert({
            order_id: order.id,
            status: "paid",
            note: `Biteship gagal: ${shipResult.error}${coordHint}. Admin dapat input AWB manual di halaman pesanan.`,
            changed_by: null,
          });
        }
      }
    }
  }

  return "settled";
}
