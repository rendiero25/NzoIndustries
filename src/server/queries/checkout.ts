import "server-only";

import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PaymentProviderId } from "@/lib/validations/checkout";

export type SavedAddress = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  fullAddress: string;
  areaId: string | null;
  isDefault: boolean;
};

export const ADDRESS_COLUMNS =
  "id, label, recipient, phone, province, city, district, postal_code, full_address, biteship_area_id, is_default";

export type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  full_address: string;
  biteship_area_id: string | null;
  is_default: boolean;
};

export function toSavedAddress(r: AddressRow): SavedAddress {
  return {
    id: r.id,
    label: r.label,
    recipient: r.recipient,
    phone: r.phone,
    province: r.province,
    city: r.city,
    district: r.district,
    postalCode: r.postal_code,
    fullAddress: r.full_address,
    areaId: r.biteship_area_id,
    isDefault: r.is_default,
  };
}

/**
 * Metode bayar aktif (toggle `store_settings`). Tabel hanya terbaca admin,
 * jadi dibaca service role dan hanya field publik yang dikembalikan.
 */
export const getPaymentOptions = cache(
  async (): Promise<{ providers: PaymentProviderId[]; timeoutMinutes: number }> => {
    const { data } = await createAdminClient()
      .from("store_settings")
      .select("mayar_enabled, manual_transfer_enabled, payment_timeout_minutes")
      .eq("id", true)
      .maybeSingle();
    const providers: PaymentProviderId[] = [];
    if (data?.mayar_enabled) providers.push("mayar");
    if (data?.manual_transfer_enabled) providers.push("manual_transfer");
    return { providers, timeoutMinutes: data?.payment_timeout_minutes ?? 1440 };
  },
);

export async function getUserAddresses(userId: string): Promise<SavedAddress[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select(ADDRESS_COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map(toSavedAddress);
}

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  paymentProvider: PaymentProviderId | null;
  paymentDueAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  createdAt: string;
  itemCount: number;
  courier: string | null;
};

/** Pesanan milik user yang login (RLS `orders_select_own`). */
export async function getOrderForUser(orderNumber: string): Promise<OrderSummary | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, grand_total, subtotal, shipping_cost, discount_total, payment_provider, payment_due_at, paid_at, created_at, order_items(quantity), shipments(courier_code, courier_service), payments(status, method, created_at)",
    )
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  const shipment = Array.isArray(data.shipments) ? data.shipments[0] : data.shipments;
  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    grandTotal: Number(data.grand_total),
    subtotal: Number(data.subtotal),
    shippingCost: Number(data.shipping_cost),
    discountTotal: Number(data.discount_total),
    paymentProvider: data.payment_provider,
    paymentDueAt: data.payment_due_at,
    paidAt: data.paid_at,
    paymentMethod:
      [...(data.payments ?? [])]
        .filter((p) => p.status === "paid")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.method ?? null,
    createdAt: data.created_at,
    itemCount: (data.order_items ?? []).reduce((n, i) => n + i.quantity, 0),
    courier: shipment
      ? `${shipment.courier_code.toUpperCase()} ${shipment.courier_service.toUpperCase()}`
      : null,
  };
}
