"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import { fetchBiteshipCourierRates } from "@/lib/biteship/fetch-courier-rates";
import { fetchCoordinatesFromPostal } from "@/lib/geo/geocode-destination";
import { ON_DEMAND_COURIERS, parseOriginCoords } from "@/lib/shipping/on-demand-coords";
import type { CheckoutShippingOption } from "@/lib/shipping/checkout-shipping-options";
import { COMPLAINT_STATUSES, type ComplaintStatus } from "@/lib/constants/complaint-status";

export async function updateComplaintStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  adminNote?: string,
): Promise<{ error?: string }> {
  if (!(COMPLAINT_STATUSES as readonly string[]).includes(newStatus)) {
    return { error: "Status tidak valid." };
  }

  const supabase = await createServiceClient();

  const resolvedAt =
    newStatus === "resolved" || newStatus === "rejected" ? new Date().toISOString() : undefined;

  const { error } = await supabase
    .from("complaints")
    .update({
      status: newStatus,
      admin_note: adminNote?.trim() || null,
      ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
    })
    .eq("id", complaintId);

  if (error) return { error: error.message };

  revalidatePath("/admin/complaints");
  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function updateAdminNote(
  complaintId: string,
  adminNote: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("complaints")
    .update({ admin_note: adminNote.trim() || null })
    .eq("id", complaintId);

  if (error) return { error: error.message };

  revalidatePath("/admin/complaints");
  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function sendAdminComplaintMessage(
  complaintId: string,
  message: string,
): Promise<{ error?: string }> {
  const { createClient: createAuthClient } = await import("@/lib/supabase/server");
  const authClient = await createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const supabase = await createServiceClient();
  const trimmedMessage = message.trim();
  const { error } = await supabase.from("complaint_messages").insert({
    complaint_id: complaintId,
    sender_id: user.id,
    sender_role: "admin",
    message: trimmedMessage,
  });
  if (error) return { error: error.message };

  const { data: complaint } = await supabase
    .from("complaints")
    .select("user_id, order_id")
    .eq("id", complaintId)
    .maybeSingle();
  if (complaint) {
    await createNotification({
      userId: complaint.user_id,
      title: "Balasan Komplain Baru",
      body: `Tim NZO Industries membalas komplain kamu: "${trimmedMessage.slice(0, 100)}"`,
      type: "complaint_reply",
      data: { complaintId, orderId: complaint.order_id },
    });
  }

  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function approveReturn(complaintId: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, order_id, user_id, status")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Komplain tidak ditemukan." };
  if (complaint.status !== "in_review")
    return { error: "Status harus 'Ditinjau' untuk approve retur." };

  // Idempotency: skip if return already exists
  const { data: existing } = await supabase
    .from("returns")
    .select("id")
    .eq("complaint_id", complaintId)
    .maybeSingle();

  if (!existing) {
    const { error: retErr } = await supabase.from("returns").insert({
      complaint_id: complaintId,
      order_id: complaint.order_id,
      user_id: complaint.user_id,
      status: "pending_shipback",
    });
    if (retErr) return { error: retErr.message };
  }

  const { error } = await supabase
    .from("complaints")
    .update({ status: "return_approved" })
    .eq("id", complaintId);
  if (error) return { error: error.message };

  await createNotification({
    userId: complaint.user_id as string,
    title: "Retur Disetujui",
    body: "Pengajuan retur Anda telah disetujui. Silakan kirim barang ke NZO Industries.",
    type: "order_update",
    data: { complaint_id: complaintId },
  });

  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath("/admin/complaints");
  return {};
}

export async function confirmReturnReceived(
  returnId: string,
  complaintId: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("returns")
    .update({ status: "received", updated_at: new Date().toISOString() })
    .eq("id", returnId)
    .eq("status", "shipped_back");

  if (error) return { error: error.message };

  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export type ReplacementShippingOption = CheckoutShippingOption;

/**
 * Ongkir untuk kiriman produk pengganti (gudang → alamat pembeli).
 * Reuse mesin rates yang sama dengan checkout: kurir aktif + origin toko dari
 * `settings`, sehingga opsi yang muncul di admin identik dengan yang dipakai
 * pembeli saat checkout.
 */
export async function fetchReplacementShippingRates(input: {
  destinationPostalCode: number;
  items: { name: string; value: number; quantity: number; weight: number }[];
}): Promise<{ ok: true; options: ReplacementShippingOption[] } | { ok: false; error: string }> {
  if (!Number.isFinite(input.destinationPostalCode) || input.destinationPostalCode <= 0) {
    return { ok: false, error: "Kode pos tujuan tidak valid." };
  }
  if (input.items.length === 0) {
    return { ok: false, error: "Pilih minimal satu item." };
  }

  const svc = createServiceClient();
  const [courierResult, originResult] = await Promise.all([
    svc.from("settings").select("value").eq("key", "active_courier_codes").single(),
    svc.from("settings").select("value").eq("key", "store_origin").single(),
  ]);

  const activeCodes = Array.isArray(courierResult.data?.value)
    ? (courierResult.data.value as string[]).filter((c) => typeof c === "string" && c)
    : [];
  if (activeCodes.length === 0) {
    return { ok: false, error: "Belum ada kurir aktif. Atur di Pengaturan → Pengiriman." };
  }

  const storeOrigin = originResult.data?.value as {
    postal_code?: string;
    lat?: string;
    lng?: string;
  } | null;
  const originRaw =
    storeOrigin?.postal_code?.trim() || process.env.BITESHIP_ORIGIN_POSTAL?.trim() || "10110";
  const originPostal = parseInt(originRaw.replace(/\D/g, "").slice(0, 5), 10);
  if (!Number.isFinite(originPostal)) {
    return { ok: false, error: "Kode pos gudang belum dikonfigurasi." };
  }

  const originCoords = parseOriginCoords(storeOrigin);
  const hasOnDemand =
    originCoords !== null && activeCodes.some((c) => ON_DEMAND_COURIERS.has(c.toLowerCase()));
  const destCoords = hasOnDemand
    ? await fetchCoordinatesFromPostal(String(input.destinationPostalCode))
    : null;

  const rates = await fetchBiteshipCourierRates({
    originPostal,
    destinationPostal: input.destinationPostalCode,
    items: input.items,
    couriers: activeCodes.join(","),
    originLat: originCoords?.lat,
    originLng: originCoords?.lng,
    destLat: destCoords?.lat,
    destLng: destCoords?.lng,
  });

  return rates.ok ? { ok: true, options: rates.options } : { ok: false, error: rates.error };
}

export async function createReplacementShipment(input: {
  returnId: string;
  complaintId: string;
  orderId: string;
  items: { name: string; value: number; quantity: number; weight: number }[];
  destinationName: string;
  destinationPhone: string;
  destinationAddress: string;
  destinationPostalCode: number;
  courierCompany: string;
  courierType: string;
  userId: string;
}): Promise<{ error?: string }> {
  const result = await createBiteshipOrder({
    destinationName: input.destinationName,
    destinationPhone: input.destinationPhone,
    destinationAddress: input.destinationAddress,
    destinationPostalCode: input.destinationPostalCode,
    courierCompany: input.courierCompany,
    courierType: input.courierType,
    items: input.items,
    orderNote: "Penggantian produk retur",
  });

  if (!result.ok) return { error: result.error };

  const supabase = await createServiceClient();

  const { error: shipErr } = await supabase.from("return_shipments").insert({
    return_id: input.returnId,
    biteship_order_id: result.biteshipOrderId,
    awb_number: result.awb,
    courier: result.courierName ?? input.courierCompany,
    status: result.status,
  });
  if (shipErr) return { error: shipErr.message };

  await supabase
    .from("returns")
    .update({ status: "replacement_sent", updated_at: new Date().toISOString() })
    .eq("id", input.returnId);

  await createNotification({
    userId: input.userId,
    title: "Produk Pengganti Dikirim",
    body: `Produk pengganti untuk komplain Anda sedang dalam perjalanan${result.awb ? ` (resi: ${result.awb})` : ""}.`,
    type: "order_update",
    data: { complaint_id: input.complaintId, awb: result.awb },
  });

  revalidatePath(`/admin/complaints/${input.complaintId}`);
  revalidatePath("/admin/returns");
  return {};
}
