import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Data dokumen cetak (Fase 9). Pesanan dibaca dengan client user-scoped, jadi
 * RLS yang menentukan: pelanggan hanya pesanannya sendiri, staf sesuai role.
 * Info toko (nama, kontak, pengirim) bukan data rahasia dan dibaca service role
 * karena `store_settings` tidak terbaca pelanggan.
 */

export type StoreInfo = {
  name: string;
  email: string | null;
  whatsapp: string | null;
  taxMode: "none" | "ppn_included";
  shipper: {
    name: string | null;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
  };
};

export type DocumentItem = {
  name: string;
  variant: string | null;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  weightGrams: number | null;
};

export type DocumentOrder = {
  orderNumber: string;
  status: string;
  invoiceNumber: string | null;
  invoiceIssuedAt: string | null;
  createdAt: string;
  paidAt: string | null;
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  grandTotal: number;
  voucherCode: string | null;
  address: Record<string, unknown>;
  items: DocumentItem[];
  payment: { method: string | null; provider: string | null; paidAt: string | null } | null;
  shipment: { courierCode: string; courierService: string; waybill: string | null } | null;
};

const ORDER_SELECT =
  "order_number, status, invoice_number, invoice_issued_at, created_at, paid_at, subtotal, shipping_cost, discount_total, grand_total, shipping_address, voucher:vouchers(code), order_items(product_name, variant_name, sku, unit_price, quantity, line_total, weight_grams), payments(status, method, provider, paid_at), shipments(courier_code, courier_service, waybill_number)";

type Row = {
  order_number: string;
  status: string;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  created_at: string;
  paid_at: string | null;
  subtotal: number;
  shipping_cost: number;
  discount_total: number;
  grand_total: number;
  shipping_address: unknown;
  voucher: { code: string } | null;
  order_items: {
    product_name: string;
    variant_name: string | null;
    sku: string;
    unit_price: number;
    quantity: number;
    line_total: number;
    weight_grams: number | null;
  }[];
  payments: {
    status: string;
    method: string | null;
    provider: string | null;
    paid_at: string | null;
  }[];
  shipments:
    | { courier_code: string; courier_service: string; waybill_number: string | null }
    | { courier_code: string; courier_service: string; waybill_number: string | null }[]
    | null;
};

function toOrder(r: Row): DocumentOrder {
  const paid = r.payments.find((p) => p.status === "paid") ?? null;
  const s = Array.isArray(r.shipments) ? r.shipments[0] : r.shipments;
  return {
    orderNumber: r.order_number,
    status: r.status,
    invoiceNumber: r.invoice_number,
    invoiceIssuedAt: r.invoice_issued_at,
    createdAt: r.created_at,
    paidAt: r.paid_at,
    subtotal: Number(r.subtotal),
    shippingCost: Number(r.shipping_cost),
    discountTotal: Number(r.discount_total),
    grandTotal: Number(r.grand_total),
    voucherCode: r.voucher?.code ? String(r.voucher.code) : null,
    address: (r.shipping_address ?? {}) as Record<string, unknown>,
    items: r.order_items.map((i) => ({
      name: i.product_name,
      variant: i.variant_name,
      sku: i.sku,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
      weightGrams: i.weight_grams,
    })),
    payment: paid ? { method: paid.method, provider: paid.provider, paidAt: paid.paid_at } : null,
    shipment: s
      ? {
          courierCode: s.courier_code,
          courierService: s.courier_service,
          waybill: s.waybill_number,
        }
      : null,
  };
}

export async function getStoreInfo(): Promise<StoreInfo> {
  const { data } = await createAdminClient()
    .from("store_settings")
    .select("store_name, support_email, support_whatsapp, tax_mode, shipper")
    .eq("id", true)
    .maybeSingle();
  const sh = (data?.shipper ?? {}) as Record<string, string | null | undefined>;
  return {
    name: data?.store_name ?? "NZO Industries",
    email: data?.support_email ?? null,
    whatsapp: data?.support_whatsapp ?? null,
    taxMode: data?.tax_mode === "ppn_included" ? "ppn_included" : "none",
    shipper: {
      name: sh.name ?? null,
      phone: sh.phone ?? null,
      address: sh.address ?? null,
      postalCode: sh.postal_code ?? null,
    },
  };
}

/** Pesanan untuk invoice; null bila tidak terlihat (RLS) atau belum punya nomor invoice. */
export async function getInvoiceOrder(orderNumber: string): Promise<DocumentOrder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error || !data) return null;
  const order = toOrder(data as unknown as Row);
  return order.invoiceNumber ? order : null;
}

export const LABEL_STATUSES = ["paid", "processing", "shipped"] as const;

/** Pesanan untuk resi (urutan mengikuti input). Hanya status siap kirim. */
export async function getLabelOrders(orderNumbers: string[]): Promise<DocumentOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("order_number", orderNumbers)
    .in("status", [...LABEL_STATUSES]);
  if (error) throw new Error(`label orders: ${error.message}`);
  const byNumber = new Map((data ?? []).map((r) => [r.order_number, toOrder(r as unknown as Row)]));
  return orderNumbers.flatMap((n) => byNumber.get(n) ?? []);
}
