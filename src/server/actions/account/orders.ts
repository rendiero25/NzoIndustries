"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { providerForRef } from "@/lib/payments/provider";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getShippingProvider, type ShippingTracking } from "@/lib/shipping/provider";
import { createClient } from "@/lib/supabase/server";

const orderSchema = z.object({ orderNumber: z.string().regex(/^NZO-\d{6}-[0-9A-F]{6}$/) });

type Result = { ok: true } | { ok: false; error: string };

async function ownOrderId(orderNumber: string, userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("order_number", orderNumber)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Batalkan pesanan yang belum dibayar; stok dilepas, link Mayar ditutup. */
export async function cancelMyOrder(input: { orderNumber: string }): Promise<Result> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pesanan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const orderId = await ownOrderId(parsed.data.orderNumber, user.id);
  if (!orderId) return { ok: false, error: "Pesanan tidak ditemukan." };

  const supabase = await createClient();
  const { data: ref, error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) {
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "Pesanan gagal dibatalkan.",
    };
  }
  if (ref) {
    try {
      await providerForRef(ref)?.close(ref);
    } catch {
      // Link kedaluwarsa sendiri; pembayaran telat dicatat paid_after_cancel.
    }
  }
  revalidatePath("/account", "layout");
  return { ok: true };
}

/** Pembeli mengonfirmasi pesanan sudah diterima. */
export async function confirmReceived(input: { orderNumber: string }): Promise<Result> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pesanan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const orderId = await ownOrderId(parsed.data.orderNumber, user.id);
  if (!orderId) return { ok: false, error: "Pesanan tidak ditemukan." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_my_order", { p_order_id: orderId });
  if (error) {
    return {
      ok: false,
      error: error.code === "P0001" ? error.message : "Gagal menyimpan konfirmasi.",
    };
  }
  revalidatePath("/account", "layout");
  return { ok: true };
}

export type TrackingResult =
  { ok: true; tracking: ShippingTracking } | { ok: false; error: string };

/** Lacak resi pesanan sendiri lewat provider ongkir. */
export async function trackMyShipment(input: { orderNumber: string }): Promise<TrackingResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pesanan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("tracking", user.id))) {
    return { ok: false, error: "Terlalu sering. Coba lagi sebentar lagi." };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("shipments(courier_code, waybill_number)")
    .eq("order_number", parsed.data.orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();
  const shipment = Array.isArray(data?.shipments) ? data.shipments[0] : data?.shipments;
  if (!shipment?.waybill_number) return { ok: false, error: "Nomor resi belum tersedia." };
  const provider = getShippingProvider();
  if (!provider) return { ok: false, error: "Pelacakan belum tersedia." };
  const res = await provider.track(shipment.courier_code, shipment.waybill_number);
  return res.ok ? { ok: true, tracking: res.data } : { ok: false, error: res.error };
}
