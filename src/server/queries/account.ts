import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/guards";
import { orderTab, withinReturnWindow, type OrderTabKey } from "@/lib/orders/status";
import { createClient } from "@/lib/supabase/server";

/**
 * Data dashboard user (Fase 7). Semua lewat client user-scoped: RLS membatasi
 * ke milik sendiri, dan setiap fungsi tetap memfilter `user_id` eksplisit.
 */
export const requireAccountUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent("/account")}`);
  return user;
});

export type AccountProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
};

export async function getMyProfile(): Promise<AccountProfile> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, created_at")
    .eq("id", user.id)
    .single();
  return {
    id: user.id,
    email: user.email,
    fullName: data?.full_name ?? null,
    phone: data?.phone ?? null,
    createdAt: data?.created_at ?? new Date().toISOString(),
  };
}

export type OrderListItem = {
  orderNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  paymentDueAt: string | null;
  itemCount: number;
  firstItem: { name: string; variantName: string | null; imagePublicId: string | null } | null;
  moreItems: number;
};

type OrderRow = {
  order_number: string;
  status: string;
  grand_total: number;
  created_at: string;
  payment_due_at: string | null;
  order_items: {
    product_name: string;
    variant_name: string | null;
    quantity: number;
    product: { images: { public_id: string; sort_order: number }[] } | null;
  }[];
};

const ORDER_LIST_SELECT =
  "order_number, status, grand_total, created_at, payment_due_at, order_items(product_name, variant_name, quantity, product:products(images:product_images(public_id, sort_order)))";

function toListItem(o: OrderRow): OrderListItem {
  const first = o.order_items[0];
  const image = first?.product?.images
    ? ([...first.product.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.public_id ?? null)
    : null;
  return {
    orderNumber: o.order_number,
    status: o.status,
    grandTotal: Number(o.grand_total),
    createdAt: o.created_at,
    paymentDueAt: o.payment_due_at,
    itemCount: o.order_items.reduce((n, i) => n + i.quantity, 0),
    firstItem: first
      ? { name: first.product_name, variantName: first.variant_name, imagePublicId: image }
      : null,
    moreItems: Math.max(0, o.order_items.length - 1),
  };
}

export const ORDERS_PER_PAGE = 10;

export async function listMyOrders(params: { tab?: string; page?: number }): Promise<{
  tab: OrderTabKey;
  page: number;
  total: number;
  orders: OrderListItem[];
}> {
  const user = await requireAccountUser();
  const tab = orderTab(params.tab);
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(ORDER_LIST_SELECT, { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE - 1);
  if (tab.statuses) query = query.in("status", [...tab.statuses]);
  const { data, count } = await query;
  return {
    tab: tab.key,
    page,
    total: count ?? 0,
    orders: ((data ?? []) as unknown as OrderRow[]).map(toListItem),
  };
}

export type AccountSummary = {
  profile: AccountProfile;
  counts: { unpaid: number; processing: number; shipped: number; completed: number };
  recent: OrderListItem[];
  vehicle: { label: string } | null;
  unreadNotifications: number;
};

export async function getAccountSummary(): Promise<AccountSummary> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const countFor = async (statuses: string[]) => {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", statuses as never[]);
    return count ?? 0;
  };
  const [profile, unpaid, processing, shipped, completed, recent, vehicle, unread] =
    await Promise.all([
      getMyProfile(),
      countFor(["pending_payment", "awaiting_verification"]),
      countFor(["paid", "processing"]),
      countFor(["shipped", "delivered"]),
      countFor(["completed"]),
      supabase
        .from("orders")
        .select(ORDER_LIST_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("user_vehicles")
        .select("year, model:vehicle_models(name, make:vehicle_makes(name))")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
  const v = vehicle.data;
  return {
    profile,
    counts: { unpaid, processing, shipped, completed },
    recent: ((recent.data ?? []) as unknown as OrderRow[]).map(toListItem),
    vehicle: v?.model
      ? { label: `${v.model.make?.name ?? ""} ${v.model.name} ${v.year}`.trim() }
      : null,
    unreadNotifications: unread.count ?? 0,
  };
}

export type OrderDetailItem = {
  id: string;
  productId: string | null;
  slug: string | null;
  name: string;
  variantName: string | null;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imagePublicId: string | null;
  review: { rating: number; status: string } | null;
  hasClaim: boolean;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  grandTotal: number;
  invoiceNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  paymentDueAt: string | null;
  paymentMethod: string | null;
  customerNote: string | null;
  address: Record<string, string | null>;
  items: OrderDetailItem[];
  history: { status: string; note: string | null; at: string }[];
  shipment: {
    courierCode: string;
    courierService: string;
    waybill: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  returns: { id: string; reason: string; status: string; createdAt: string }[];
  canReturn: boolean;
  returnDeadline: string | null;
  canReview: boolean;
};

export async function getMyOrder(orderNumber: string): Promise<OrderDetail | null> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, invoice_number, subtotal, shipping_cost, discount_total, grand_total, created_at, updated_at, paid_at, payment_due_at, customer_note, shipping_address, order_items(id, product_id, product_name, variant_name, sku, unit_price, quantity, line_total, product:products(slug, images:product_images(public_id, sort_order))), order_status_history(to_status, note, created_at), shipments(courier_code, courier_service, waybill_number, status, shipped_at, delivered_at), payments(status, method, created_at), returns(id, reason, status, created_at)",
    )
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!o) return null;

  const itemIds = o.order_items.map((i) => i.id);
  const [{ data: reviews }, { data: claims }, { data: settings }] = await Promise.all([
    itemIds.length
      ? supabase
          .from("reviews")
          .select("order_item_id, rating, status")
          .in("order_item_id", itemIds)
      : Promise.resolve({
          data: [] as { order_item_id: string; rating: number; status: string }[],
        }),
    itemIds.length
      ? supabase.from("warranty_claims").select("order_item_id").in("order_item_id", itemIds)
      : Promise.resolve({ data: [] as { order_item_id: string }[] }),
    supabase.rpc("store_return_window_days"),
  ]);

  const shipment = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;
  const received = ["delivered", "completed"].includes(o.status);
  const receivedAt = new Date(shipment?.delivered_at ?? o.updated_at);
  const windowDays = typeof settings === "number" ? settings : 7;
  const deadline = received ? new Date(receivedAt.getTime() + windowDays * 86_400_000) : null;

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
    paymentMethod:
      [...(o.payments ?? [])]
        .filter((p) => p.status === "paid")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.method ?? null,
    customerNote: o.customer_note,
    address: (o.shipping_address ?? {}) as Record<string, string | null>,
    items: o.order_items.map((i) => {
      const review = reviews?.find((r) => r.order_item_id === i.id);
      const image = i.product?.images
        ? ([...i.product.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.public_id ?? null)
        : null;
      return {
        id: i.id,
        productId: i.product_id,
        slug: i.product?.slug ?? null,
        name: i.product_name,
        variantName: i.variant_name,
        sku: i.sku,
        unitPrice: Number(i.unit_price),
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
        imagePublicId: image,
        review: review ? { rating: review.rating, status: review.status } : null,
        hasClaim: !!claims?.some((c) => c.order_item_id === i.id),
      };
    }),
    history: [...(o.order_status_history ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((h) => ({ status: h.to_status, note: h.note, at: h.created_at })),
    shipment: shipment
      ? {
          courierCode: shipment.courier_code,
          courierService: shipment.courier_service,
          waybill: shipment.waybill_number,
          status: shipment.status,
          shippedAt: shipment.shipped_at,
          deliveredAt: shipment.delivered_at,
        }
      : null,
    returns: (o.returns ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    })),
    canReturn:
      received && withinReturnWindow(receivedAt, windowDays) && (o.returns ?? []).length === 0,
    returnDeadline: deadline ? deadline.toISOString() : null,
    canReview: received,
  };
}

export type MyVehicle = {
  id: string;
  modelId: string;
  year: number;
  label: string;
  type: "motorcycle" | "car";
  isDefault: boolean;
};

export async function listMyVehicles(): Promise<MyVehicle[]> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_vehicles")
    .select(
      "id, model_id, year, is_default, created_at, model:vehicle_models(name, vehicle_type, make:vehicle_makes(name))",
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((v) => ({
    id: v.id,
    modelId: v.model_id,
    year: v.year,
    label: `${v.model?.make?.name ?? ""} ${v.model?.name ?? ""} ${v.year}`
      .replace(/\s+/g, " ")
      .trim(),
    type: v.model?.vehicle_type === "car" ? "car" : "motorcycle",
    isDefault: v.is_default,
  }));
}

export type PendingReviewItem = {
  orderItemId: string;
  orderNumber: string;
  name: string;
  variantName: string | null;
  imagePublicId: string | null;
};

export type MyReview = {
  id: string;
  productSlug: string | null;
  productName: string;
  rating: number;
  comment: string | null;
  status: string;
  reply: string | null;
  createdAt: string;
};

export async function listMyReviews(): Promise<{
  pending: PendingReviewItem[];
  reviews: MyReview[];
}> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const [{ data: items }, { data: reviews }] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, product_id, product_name, variant_name, order:orders!inner(order_number, status, user_id), product:products(images:product_images(public_id, sort_order))",
      )
      .eq("order.user_id", user.id)
      .in("order.status", ["delivered", "completed"])
      .not("product_id", "is", null)
      .limit(100),
    supabase
      .from("reviews")
      .select(
        "id, rating, comment, status, reply, created_at, order_item_id, product:products(slug, name)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const reviewed = new Set((reviews ?? []).map((r) => r.order_item_id));
  return {
    pending: (items ?? [])
      .filter((i) => !reviewed.has(i.id))
      .map((i) => ({
        orderItemId: i.id,
        orderNumber: i.order.order_number,
        name: i.product_name,
        variantName: i.variant_name,
        imagePublicId: i.product?.images
          ? ([...i.product.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.public_id ??
            null)
          : null,
      })),
    reviews: (reviews ?? []).map((r) => ({
      id: r.id,
      productSlug: r.product?.slug ?? null,
      productName: r.product?.name ?? "Produk",
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      reply: r.reply,
      createdAt: r.created_at,
    })),
  };
}

export type AfterSalesEntry = {
  id: string;
  kind: "return" | "claim";
  orderNumber: string | null;
  title: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  resolution: string | null;
  createdAt: string;
};

export async function listMyAfterSales(): Promise<AfterSalesEntry[]> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const [{ data: returns }, { data: claims }] = await Promise.all([
    supabase
      .from("returns")
      .select(
        "id, reason, description, status, admin_note, resolution, created_at, order:orders(order_number)",
      )
      .eq("user_id", user.id),
    supabase
      .from("warranty_claims")
      .select(
        "id, description, status, admin_note, resolution, created_at, item:order_items(product_name, order:orders(order_number))",
      )
      .eq("user_id", user.id),
  ]);
  const entries: AfterSalesEntry[] = [
    ...(returns ?? []).map((r) => ({
      id: r.id,
      kind: "return" as const,
      orderNumber: r.order?.order_number ?? null,
      title: `Retur: ${r.reason}`,
      description: r.description,
      status: r.status,
      adminNote: r.admin_note,
      resolution: r.resolution,
      createdAt: r.created_at,
    })),
    ...(claims ?? []).map((c) => ({
      id: c.id,
      kind: "claim" as const,
      orderNumber: c.item?.order?.order_number ?? null,
      title: `Garansi: ${c.item?.product_name ?? "Produk"}`,
      description: c.description,
      status: c.status,
      adminNote: c.admin_note,
      resolution: c.resolution,
      createdAt: c.created_at,
    })),
  ];
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type MyNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export const NOTIFICATIONS_PER_PAGE = 20;

export async function listMyNotifications(
  page = 1,
): Promise<{ total: number; items: MyNotification[] }> {
  const user = await requireAccountUser();
  const supabase = await createClient();
  const p = Math.max(1, Math.floor(page));
  const { data, count } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range((p - 1) * NOTIFICATIONS_PER_PAGE, p * NOTIFICATIONS_PER_PAGE - 1);
  return {
    total: count ?? 0,
    items: (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
  };
}

export type PublicVoucher = {
  code: string;
  description: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxDiscount: number | null;
  minSubtotal: number;
  endsAt: string | null;
};

export type VoucherUse = {
  code: string;
  description: string | null;
  discountAmount: number;
  orderNumber: string;
  usedAt: string;
};

export async function getMyVouchers(): Promise<{
  available: PublicVoucher[];
  history: VoucherUse[];
}> {
  await requireAccountUser();
  const supabase = await createClient();
  const [{ data: available }, { data: history }] = await Promise.all([
    supabase
      .from("vouchers")
      .select(
        "code, description, discount_type, discount_value, max_discount, min_subtotal, ends_at",
      )
      .eq("is_public", true)
      .order("ends_at", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase.rpc("my_voucher_history"),
  ]);
  return {
    available: (available ?? []).map((v) => ({
      code: String(v.code),
      description: v.description,
      discountType: v.discount_type,
      discountValue: Number(v.discount_value),
      maxDiscount: v.max_discount === null ? null : Number(v.max_discount),
      minSubtotal: Number(v.min_subtotal),
      endsAt: v.ends_at,
    })),
    history: (history ?? []).map((h) => ({
      code: h.code,
      description: h.description,
      discountAmount: Number(h.discount_amount),
      orderNumber: h.order_number,
      usedAt: h.used_at,
    })),
  };
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
