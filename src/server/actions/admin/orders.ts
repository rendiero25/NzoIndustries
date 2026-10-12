"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getShippingProvider } from "@/lib/shipping/provider";
import { createClient } from "@/lib/supabase/server";

import { adminGuard, ROLES, rpcMessage } from "./_guard";

const statusSchema = z.object({
  orderNumber: z.string().regex(/^NZO-\d{6}-[0-9A-F]{6}$/),
  to: z.enum(["processing", "shipped", "delivered", "completed", "cancelled", "refunded", "paid"]),
  note: z.string().trim().max(300).optional(),
  courierCode: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{0,40}$/i, "Kode kurir tidak valid.")
    .optional(),
  waybill: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{0,60}$/, "Nomor resi hanya huruf, angka, dan tanda minus.")
    .optional(),
});

type Result = { ok: true } | { ok: false; error: string };

/** Ubah status pesanan lewat RPC `admin_set_order_status` (matriks transisi di DB). */
export async function setOrderStatus(input: z.input<typeof statusSchema>): Promise<Result> {
  const guard = await adminGuard(ROLES.orders);
  if (!guard.ok) return guard;
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const v = parsed.data;
  if ((v.to === "cancelled" || v.to === "refunded") && !v.note) {
    return { ok: false, error: "Tulis alasan pembatalan/refund." };
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("order_number", v.orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };

  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: order.id,
    p_to: v.to,
    p_note: v.note || undefined,
    p_courier_code: v.courierCode || undefined,
    p_waybill: v.waybill || undefined,
  });
  if (error) return { ok: false, error: rpcMessage(error, "Status gagal diubah.") };
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${v.orderNumber}`);
  revalidatePath("/admin");
  return { ok: true };
}

export type ShipmentResult = { ok: true; waybill: string } | { ok: false; error: string };

/**
 * Buat pengiriman di Biteship (D-40). Butuh key + data gudang (P-11); tanpa itu
 * mengembalikan pesan agar admin memakai input resi manual.
 */
export async function createCourierShipment(input: {
  orderNumber: string;
}): Promise<ShipmentResult> {
  const guard = await adminGuard(ROLES.orders);
  if (!guard.ok) return guard;
  const parsed = z
    .object({ orderNumber: z.string().regex(/^NZO-\d{6}-[0-9A-F]{6}$/) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pesanan tidak valid." };

  const provider = getShippingProvider();
  if (!provider?.createShipment) {
    return { ok: false, error: "Pengiriman otomatis belum aktif. Isi nomor resi manual." };
  }
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, shipping_address, order_items(product_name, quantity, unit_price, weight_grams), shipments(courier_code, courier_service)",
    )
    .eq("order_number", parsed.data.orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (!["paid", "processing"].includes(order.status)) {
    return { ok: false, error: "Hanya pesanan dibayar/diproses yang bisa dikirim." };
  }
  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments;
  if (!shipment) return { ok: false, error: "Data kurir pesanan tidak ada." };

  const res = await provider.createShipment({
    reference: order.order_number,
    courierCode: shipment.courier_code,
    courierService: shipment.courier_service,
    destination: (order.shipping_address ?? {}) as Record<string, string | null>,
    items: (order.order_items ?? []).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      value: Number(i.unit_price),
      weightGrams: i.weight_grams ?? 1000,
    })),
  });
  if (!res.ok) return res;
  if (res.data.externalId) {
    await supabase
      .from("shipments")
      .update({ biteship_order_id: res.data.externalId })
      .eq("order_id", order.id);
  }

  const status = await setOrderStatus({
    orderNumber: order.order_number,
    to: "shipped",
    courierCode: shipment.courier_code,
    waybill: res.data.waybill,
    note: "Pengiriman dibuat di Biteship",
  });
  return status.ok ? { ok: true, waybill: res.data.waybill } : status;
}
