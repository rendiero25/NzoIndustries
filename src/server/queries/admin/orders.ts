import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Data pesanan untuk panel admin (RLS `orders_select_staff`). */
export const ADMIN_ORDERS_PER_PAGE = 20;

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  paidAt: string | null;
  customer: string;
  itemCount: number;
  courier: string | null;
  waybill: string | null;
};

export type AdminOrderFilters = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
};

const STATUSES = new Set([
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "expired",
  "refunded",
]);

export async function listAdminOrders(
  f: AdminOrderFilters,
): Promise<{ total: number; rows: AdminOrderRow[]; page: number }> {
  const supabase = await createClient();
  const page = Math.max(1, Math.floor(f.page ?? 1));
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, grand_total, created_at, paid_at, shipping_address, order_items(quantity), shipments(courier_code, courier_service, waybill_number)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * ADMIN_ORDERS_PER_PAGE, page * ADMIN_ORDERS_PER_PAGE - 1);
  // "ready" = siap kirim (lunas/diproses, belum dikirim): dipakai untuk cetak resi massal.
  if (f.status === "ready") query = query.in("status", ["paid", "processing"]);
  else if (f.status && STATUSES.has(f.status)) query = query.eq("status", f.status as never);
  const q = f.q?.trim();
  if (q) {
    const safe = q.replace(/[%,()]/g, " ").slice(0, 60);
    query = query.or(`order_number.ilike.%${safe}%,shipping_address->>recipient.ilike.%${safe}%`);
  }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from))
    query = query.gte("created_at", `${f.from}T00:00:00+07:00`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to))
    query = query.lte("created_at", `${f.to}T23:59:59+07:00`);

  const { data, count } = await query;
  return {
    page,
    total: count ?? 0,
    rows: (data ?? []).map((o) => {
      const s = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;
      const addr = (o.shipping_address ?? {}) as { recipient?: string };
      return {
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        grandTotal: Number(o.grand_total),
        createdAt: o.created_at,
        paidAt: o.paid_at,
        customer: addr.recipient ?? "—",
        itemCount: (o.order_items ?? []).reduce((n, i) => n + i.quantity, 0),
        courier: s ? `${s.courier_code.toUpperCase()} ${s.courier_service.toUpperCase()}` : null,
        waybill: s?.waybill_number ?? null,
      };
    }),
  };
}

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  invoiceNumber: string | null;
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: string;
  paidAt: string | null;
  paymentDueAt: string | null;
  customerNote: string | null;
  cancelReason: string | null;
  address: Record<string, string | null>;
  customer: { id: string; name: string | null; phone: string | null } | null;
  items: {
    id: string;
    productId: string | null;
    name: string;
    variantName: string | null;
    sku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  payments: {
    status: string;
    method: string | null;
    providerRef: string | null;
    amount: number;
    paidAt: string | null;
    createdAt: string;
  }[];
  shipment: {
    courierCode: string;
    courierService: string;
    waybill: string | null;
    status: string;
    cost: number;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  history: { status: string; note: string | null; at: string }[];
  voucherCode: string | null;
};

export async function getAdminOrder(orderNumber: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select(
      "id, user_id, order_number, status, invoice_number, subtotal, shipping_cost, discount_total, grand_total, created_at, paid_at, payment_due_at, customer_note, cancel_reason, shipping_address, voucher:vouchers(code), order_items(id, product_id, product_name, variant_name, sku, unit_price, quantity, line_total), payments(status, method, provider_ref, amount, paid_at, created_at), shipments(courier_code, courier_service, waybill_number, status, cost, shipped_at, delivered_at), order_status_history(to_status, note, created_at)",
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!o) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", o.user_id)
    .maybeSingle();
  const s = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;

  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    invoiceNumber: o.invoice_number,
    subtotal: Number(o.subtotal),
    shippingCost: Number(o.shipping_cost),
    discountTotal: Number(o.discount_total),
    grandTotal: Number(o.grand_total),
    createdAt: o.created_at,
    paidAt: o.paid_at,
    paymentDueAt: o.payment_due_at,
    customerNote: o.customer_note,
    cancelReason: o.cancel_reason,
    address: (o.shipping_address ?? {}) as Record<string, string | null>,
    customer: profile ? { id: profile.id, name: profile.full_name, phone: profile.phone } : null,
    items: (o.order_items ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      variantName: i.variant_name,
      sku: i.sku,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
    })),
    payments: [...(o.payments ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => ({
        status: p.status,
        method: p.method,
        providerRef: p.provider_ref,
        amount: Number(p.amount),
        paidAt: p.paid_at,
        createdAt: p.created_at,
      })),
    shipment: s
      ? {
          courierCode: s.courier_code,
          courierService: s.courier_service,
          waybill: s.waybill_number,
          status: s.status,
          cost: Number(s.cost),
          shippedAt: s.shipped_at,
          deliveredAt: s.delivered_at,
        }
      : null,
    history: [...(o.order_status_history ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((h) => ({ status: h.to_status, note: h.note, at: h.created_at })),
    voucherCode: o.voucher?.code ? String(o.voucher.code) : null,
  };
}
