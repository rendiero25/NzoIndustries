import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/legacy/server";

import type { Database } from "@/types/legacy-supabase";

import type { OrderStatus } from "@/lib/constants/order-status-labels";
import type { ProductDetailVariant } from "@/lib/types/product-detail";
import { computeVariantUnitPrice, pickDefaultVariantId } from "@/lib/utils/product-detail-pricing";

export type DashboardOrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "order_number" | "status" | "total" | "created_at"
> & {
  items: { image_url: string | null; quantity: number; product_name: string }[];
};

type OrderItemQueryRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  product_variants:
    | {
        product_id: string;
        products: { slug: string } | { slug: string }[] | null;
      }
    | {
        product_id: string;
        products: { slug: string } | { slug: string }[] | null;
      }[]
    | null;
};

export type DashboardOrderItemRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  product_id: string | null;
  product_slug: string | null;
};

function mapOrderItemRow(row: OrderItemQueryRow): DashboardOrderItemRow {
  const { product_variants: pvRaw, ...base } = row;
  const pv = Array.isArray(pvRaw) ? pvRaw[0] : pvRaw;
  const prodRaw = pv?.products ?? null;
  const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw;
  return {
    ...base,
    product_id: pv?.product_id ?? null,
    product_slug: prod?.slug ?? null,
  };
}

export type OrderStatusHistoryItem = {
  status: string;
  note: string | null;
  created_at: string;
};

export type DashboardOrderDetail = {
  order: Database["public"]["Tables"]["orders"]["Row"];
  items: DashboardOrderItemRow[];
  payments: Database["public"]["Tables"]["payments"]["Row"][];
  shipments: Database["public"]["Tables"]["shipments"]["Row"][];
  statusHistory: OrderStatusHistoryItem[];
};

export type DashboardOverview = {
  /** @deprecated orderCount moved to DashboardOrderStats.totalOrders */
  orderCount: number;
  unreadNotifications: number;
  wishlistCount: number;
};

/**
 * Semua order-related stats dalam SATU DB query.
 * Menggantikan: fetchProcessingOrdersCount, fetchPaidAndShippedOrderCounts,
 *               fetchCompletedOrdersCount, fetchTotalSpending, dan orderCount dari overview.
 */
export type DashboardOrderStats = {
  totalOrders: number;
  processingCount: number; // paid | processing | shipped
  shippedCount: number;
  completedCount: number;
  totalSpending: number; // paid | processing | shipped | delivered | completed
};

export async function fetchDashboardOrderStats(userId: string): Promise<DashboardOrderStats> {
  const zero: DashboardOrderStats = {
    totalOrders: 0,
    processingCount: 0,
    shippedCount: 0,
    completedCount: 0,
    totalSpending: 0,
  };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("status, total")
      .eq("user_id", userId);
    if (error || !data) return zero;

    const ACTIVE_STATUSES = new Set(["paid", "processing", "shipped", "delivered", "completed"]);
    let totalOrders = 0,
      processingCount = 0,
      shippedCount = 0,
      completedCount = 0,
      totalSpending = 0;
    for (const { status: s, total } of data) {
      totalOrders++;
      if (s === "paid" || s === "processing" || s === "shipped") processingCount++;
      if (s === "shipped") shippedCount++;
      if (s === "completed") completedCount++;
      if (ACTIVE_STATUSES.has(s)) totalSpending += total ?? 0;
    }
    return { totalOrders, processingCount, shippedCount, completedCount, totalSpending };
  } catch {
    return zero;
  }
}

export type WishlistItemRow = {
  wishlistId: string;
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageAlt: string | null;
  eyebrow: string;
  variantId: string | null;
  variantName: string | null;
  currentPrice: number;
  compareAtPrice: number | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
};

export type ProblemPaymentRow = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  status: Database["public"]["Enums"]["payment_status"];
  gross_amount: number;
  created_at: string;
};

export async function fetchDashboardOverview(userId: string): Promise<DashboardOverview> {
  try {
    const supabase = await createClient();
    // orders count removed — now computed by fetchDashboardOrderStats (1 query instead of 3+)
    const [notifRes, wishRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
      supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    return {
      orderCount: 0, // kept for type compat, use orderStats.totalOrders instead
      unreadNotifications: notifRes.count ?? 0,
      wishlistCount: wishRes.count ?? 0,
    };
  } catch {
    return { orderCount: 0, unreadNotifications: 0, wishlistCount: 0 };
  }
}

export const ORDERS_PER_PAGE = 10;

export type OrderSortOption = "newest" | "oldest" | "total_desc" | "total_asc";

export async function fetchUserOrders(
  userId: string,
  statusFilter: OrderStatus | "" | null,
  search: string,
  page: number,
  categoryId?: string,
  sort: OrderSortOption = "newest",
): Promise<{ orders: DashboardOrderRow[]; total: number }> {
  try {
    const supabase = await createClient();
    const from = page * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;
    const trimmed = search.trim();

    // Resolve order IDs from order_items when searching by product name or filtering by category
    let filteredOrderIds: string[] | null = null;
    if (trimmed.length > 0 || categoryId) {
      let matchOrderIds: string[] = [];

      if (categoryId) {
        const { data: catItems } = await supabase
          .from("order_items")
          .select("order_id, product_variants!inner(products!inner(category_id))")
          .eq("product_variants.products.category_id" as "order_id", categoryId as string);
        matchOrderIds = [
          ...new Set((catItems ?? []).map((r) => (r as unknown as { order_id: string }).order_id)),
        ];
      }

      if (trimmed.length > 0) {
        let nameQ = supabase
          .from("order_items")
          .select("order_id")
          .ilike("product_name", `%${trimmed}%`);
        if (categoryId && matchOrderIds.length > 0) {
          nameQ = nameQ.in("order_id", matchOrderIds);
        }
        const { data: nameItems } = await nameQ;
        const nameOrderIds = [...new Set((nameItems ?? []).map((r) => r.order_id))];
        filteredOrderIds = categoryId ? nameOrderIds : nameOrderIds;
      } else {
        filteredOrderIds = matchOrderIds;
      }
    }

    const sortMap: Record<OrderSortOption, { column: string; ascending: boolean }> = {
      newest: { column: "created_at", ascending: false },
      oldest: { column: "created_at", ascending: true },
      total_desc: { column: "total", ascending: false },
      total_asc: { column: "total", ascending: true },
    };
    const { column: sortCol, ascending: sortAsc } = sortMap[sort];

    let q = supabase
      .from("orders")
      .select(
        "id, order_number, status, total, created_at, order_items(image_url, quantity, product_name)",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order(sortCol, { ascending: sortAsc })
      .range(from, to);

    if (statusFilter && statusFilter.length > 0) {
      q = q.eq("status", statusFilter);
    }

    if (trimmed.length > 0 || categoryId) {
      if (!filteredOrderIds || filteredOrderIds.length === 0) {
        // also try matching order_number when no category filter
        if (!categoryId && trimmed.length > 0) {
          q = q.ilike("order_number", `%${trimmed}%`);
        } else {
          return { orders: [], total: 0 };
        }
      } else {
        if (!categoryId && trimmed.length > 0) {
          // combine: match order_number OR order_ids from product name match
          const { data: orderNumMatch } = await supabase
            .from("orders")
            .select("id")
            .eq("user_id", userId)
            .ilike("order_number", `%${trimmed}%`);
          const combined = [
            ...new Set([...filteredOrderIds, ...(orderNumMatch ?? []).map((r) => r.id)]),
          ];
          q = q.in("id", combined);
        } else {
          q = q.in("id", filteredOrderIds);
        }
      }
    }

    const { data, error, count } = await q;
    if (error || !data) return { orders: [], total: 0 };

    return {
      orders: data.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total: o.total,
        created_at: o.created_at,
        items: Array.isArray(o.order_items) ? o.order_items : [],
      })),
      total: count ?? 0,
    };
  } catch {
    return { orders: [], total: 0 };
  }
}

export type DashboardOrderListPreview = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  previewName: string | null;
  previewImage: string | null;
  previewQty: number;
  previewUnitPrice: number;
};

export async function fetchProcessingOrdersCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["paid", "processing", "shipped"]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchPaidAndShippedOrderCounts(
  userId: string,
): Promise<{ paid: number; shipped: number }> {
  try {
    const supabase = await createClient();
    const [paidRes, shippedRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "paid"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "shipped"),
    ]);
    return {
      paid: paidRes.count ?? 0,
      shipped: shippedRes.count ?? 0,
    };
  } catch {
    return { paid: 0, shipped: 0 };
  }
}

export async function fetchRecentOrdersListPreview(
  userId: string,
  limit: number,
): Promise<DashboardOrderListPreview[]> {
  try {
    const supabase = await createClient();
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (oErr || !orders?.length) return [];

    const orderIds = orders.map((o) => o.id);
    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select("order_id, product_name, image_url, quantity, price, id")
      .in("order_id", orderIds)
      .order("id", { ascending: true });
    if (iErr) return [];

    const firstByOrder = new Map<
      string,
      { product_name: string; image_url: string | null; quantity: number; price: number }
    >();
    for (const it of items ?? []) {
      if (!firstByOrder.has(it.order_id)) {
        firstByOrder.set(it.order_id, {
          product_name: it.product_name,
          image_url: it.image_url,
          quantity: it.quantity,
          price: it.price,
        });
      }
    }

    return orders.map((o) => {
      const fi = firstByOrder.get(o.id);
      return {
        id: o.id,
        order_number: o.order_number,
        status: o.status as OrderStatus,
        total: o.total,
        created_at: o.created_at,
        previewName: fi?.product_name ?? null,
        previewImage: fi?.image_url ?? null,
        previewQty: fi?.quantity ?? 0,
        previewUnitPrice: fi?.price ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export const fetchOrderDetailForUser = cache(
  async (userId: string, orderId: string): Promise<DashboardOrderDetail | null> => {
    try {
      const supabase = await createClient();
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", userId)
        .maybeSingle();
      if (oErr || !order) return null;

      const [itemsRes, payRes, shipRes, historyRes] = await Promise.all([
        supabase
          .from("order_items")
          .select(
            `
          *,
          product_variants (
            product_id,
            products ( slug )
          )
        `,
          )
          .eq("order_id", orderId)
          .order("id", { ascending: true }),
        supabase
          .from("payments")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("shipments")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
        supabase
          .from("order_status_history")
          .select("status, note, created_at")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
      ]);

      const rawItems = (itemsRes.data ?? []) as OrderItemQueryRow[];
      const items = rawItems.map(mapOrderItemRow);

      return {
        order,
        items,
        payments: payRes.data ?? [],
        shipments: shipRes.data ?? [],
        statusHistory: (historyRes.data ?? []) as OrderStatusHistoryItem[],
      };
    } catch {
      return null;
    }
  },
);

export const WISHLIST_PER_PAGE = 20;

export async function fetchWishlistForUser(
  userId: string,
  page = 0,
): Promise<{ items: WishlistItemRow[]; total: number }> {
  try {
    const supabase = await createClient();
    const from = page * WISHLIST_PER_PAGE;
    const to = from + WISHLIST_PER_PAGE - 1;
    const { data, error, count } = await supabase
      .from("wishlists")
      .select(
        `id, product_id, products(
          id, name, slug, base_price, sale_price, average_rating, review_count, total_sold,
          categories:category_id(name),
          product_images(url, is_primary, sort_order, alt_text),
          product_variants(id, name, sku, price, stock, reserved, is_active)
        )`,
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !data?.length) return { items: [], total: 0 };

    type Img = {
      url: string;
      is_primary: boolean | null;
      sort_order: number | null;
      alt_text: string | null;
    };
    type VarRow = {
      id: string;
      name: string;
      sku: string;
      price: number;
      stock: number;
      reserved: number | null;
      is_active: boolean | null;
      sort_order: number | null;
    };
    type Cat = { name: string } | { name: string }[] | null;
    type P = {
      id: string;
      name: string;
      slug: string;
      base_price: number;
      sale_price: number | null;
      average_rating: number | null;
      review_count: number | null;
      total_sold: number | null;
      categories: Cat;
      product_images: Img[] | null;
      product_variants: VarRow[] | VarRow | null;
    };
    type Row = { id: string; product_id: string; products: P | P[] | null };

    const firstCat = (c: Cat): string => {
      if (c == null) return "";
      const x = Array.isArray(c) ? c[0] : c;
      return x?.name?.trim() ?? "";
    };

    const out: WishlistItemRow[] = [];
    for (const row of data as unknown as Row[]) {
      const p = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!p?.slug) {
        out.push({
          wishlistId: row.id,
          productId: row.product_id,
          name: "Produk tidak dapat ditampilkan",
          slug: "",
          imageUrl: null,
          imageAlt: null,
          eyebrow: "",
          variantId: null,
          variantName: null,
          currentPrice: 0,
          compareAtPrice: null,
          rating: 0,
          reviewCount: 0,
          soldCount: 0,
        });
        continue;
      }

      const imgs = p.product_images ?? [];
      const primary =
        imgs.find((i) => i.is_primary) ??
        [...imgs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
      const imageUrl = primary?.url ?? null;
      const imageAlt = primary?.alt_text?.trim() || p.name;

      const variantsRaw = p.product_variants;
      const list = Array.isArray(variantsRaw) ? variantsRaw : variantsRaw ? [variantsRaw] : [];
      const active = list.filter((v) => v.is_active !== false);
      const withAvail = active.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        stock: Math.max(0, (v.stock ?? 0) - (v.reserved ?? 0)),
      })) as ProductDetailVariant[];

      const basePrice = Number(p.base_price ?? 0);
      const salePrice = p.sale_price != null ? Number(p.sale_price) : null;

      let variantId: string | null = null;
      let variantName: string | null = null;
      let currentPrice = basePrice;
      let compareAtPrice: number | null = null;

      if (withAvail.length > 0) {
        const inStock = withAvail.filter((v) => v.stock >= 1);
        const pool = inStock.length > 0 ? inStock : withAvail;
        const pickedId = pickDefaultVariantId(pool, basePrice, salePrice);
        const picked = pool.find((v) => v.id === pickedId) ?? pool[0];
        if (picked) {
          variantId = picked.id;
          variantName = picked.name;
          const { listPrice, unitPrice } = computeVariantUnitPrice({
            basePrice,
            salePrice,
            variantPrice: picked.price,
          });
          currentPrice = unitPrice;
          compareAtPrice = listPrice > unitPrice ? listPrice : null;
        }
      }

      out.push({
        wishlistId: row.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl,
        imageAlt,
        eyebrow: firstCat(p.categories),
        variantId,
        variantName,
        currentPrice,
        compareAtPrice,
        rating: Number(p.average_rating ?? 0),
        reviewCount: p.review_count ?? 0,
        soldCount: p.total_sold ?? 0,
      });
    }
    return { items: out, total: count ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export type PendingOrderPreview = {
  id: string;
  order_number: string;
  total: number;
  created_at: string;
  expiryTime: string | null;
  vaNumber: string | null;
  paymentCode: string | null;
  transactionId: string | null;
  paymentType: string | null;
  previewName: string | null;
  previewImage: string | null;
};

export async function fetchPendingPaymentOrders(
  userId: string,
  limit = 5,
): Promise<PendingOrderPreview[]> {
  const cap = Math.min(Math.max(limit, 1), 20);
  try {
    const supabase = await createClient();
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id, order_number, total, created_at")
      .eq("user_id", userId)
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(cap);
    if (oErr || !orders?.length) return [];

    const orderIds = orders.map((o) => o.id);
    const [{ data: items }, { data: paymentsRaw }] = await Promise.all([
      supabase
        .from("order_items")
        .select("order_id, product_name, image_url, id")
        .in("order_id", orderIds)
        .order("id", { ascending: true }),
      supabase
        .from("payments")
        .select(
          "order_id, expiry_time, va_number, payment_code, mayar_transaction_id, midtrans_transaction_id, payment_type",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: false }),
    ]);

    const firstByOrder = new Map<string, { product_name: string; image_url: string | null }>();
    for (const it of items ?? []) {
      if (!firstByOrder.has(it.order_id)) {
        firstByOrder.set(it.order_id, { product_name: it.product_name, image_url: it.image_url });
      }
    }

    type PaymentMeta = {
      expiry_time: string | null;
      va_number: string | null;
      payment_code: string | null;
      transaction_id: string | null;
      payment_type: string | null;
    };
    const paymentByOrder = new Map<string, PaymentMeta>();
    for (const p of paymentsRaw ?? []) {
      if (!paymentByOrder.has(p.order_id)) {
        paymentByOrder.set(p.order_id, {
          expiry_time: p.expiry_time ?? null,
          va_number: p.va_number ?? null,
          payment_code: p.payment_code ?? null,
          transaction_id: p.mayar_transaction_id ?? p.midtrans_transaction_id ?? null,
          payment_type: p.payment_type ?? null,
        });
      }
    }

    const PAYMENT_WINDOW_MS = 3 * 60 * 60 * 1000;
    const now = Date.now();
    return (
      orders
        .map((o) => {
          const fi = firstByOrder.get(o.id);
          const pm = paymentByOrder.get(o.id);
          const expiryTime = pm?.expiry_time
            ? pm.expiry_time
            : new Date(new Date(o.created_at).getTime() + PAYMENT_WINDOW_MS).toISOString();
          return {
            id: o.id,
            order_number: o.order_number,
            total: o.total,
            created_at: o.created_at,
            expiryTime,
            vaNumber: pm?.va_number ?? null,
            paymentCode: pm?.payment_code ?? null,
            transactionId: pm?.transaction_id ?? null,
            paymentType: pm?.payment_type ?? null,
            previewName: fi?.product_name ?? null,
            previewImage: fi?.image_url ?? null,
          };
        })
        // Hide orders whose payment window has already closed.
        // The cron /api/cron/expire-orders will cancel them in DB asynchronously.
        .filter((o) => o.expiryTime != null && new Date(o.expiryTime).getTime() > now)
    );
  } catch {
    return [];
  }
}

export async function fetchUserNotifications(userId: string, limit: number) {
  const cap = Math.min(Math.max(limit, 1), 100);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, type, is_read, created_at, data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(cap);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export type CouponPublicRow = Pick<
  Database["public"]["Tables"]["coupons"]["Row"],
  | "id"
  | "code"
  | "type"
  | "value"
  | "min_purchase"
  | "max_discount"
  | "valid_from"
  | "valid_until"
  | "used_count"
  | "max_usage"
  | "image_url"
  | "title"
>;

// cache() deduplicates across generateMetadata + page render, and across concurrent requests
export const fetchActiveCouponsForStore = cache(
  async function fetchActiveCouponsForStore(): Promise<CouponPublicRow[]> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("coupons")
        .select(
          "id, code, type, value, min_purchase, max_discount, valid_from, valid_until, used_count, max_usage, image_url, title",
        )
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(50);
      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  },
);

export async function fetchUserProfile(
  userId: string,
): Promise<Database["public"]["Tables"]["profiles"]["Row"] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchUserAddresses(
  userId: string,
): Promise<Database["public"]["Tables"]["addresses"]["Row"][]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function fetchAddressForUser(
  userId: string,
  addressId: string,
): Promise<Database["public"]["Tables"]["addresses"]["Row"] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchProblemPaymentsForUser(
  userId: string,
  limit = 12,
): Promise<ProblemPaymentRow[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  try {
    const supabase = await createClient();
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("user_id", userId);
    if (oErr || !orders?.length) return [];
    const orderIds = orders.map((o) => o.id);
    const numMap = new Map(orders.map((o) => [o.id, o.order_number]));
    const { data: pays, error: pErr } = await supabase
      .from("payments")
      .select("id, order_id, status, gross_amount, created_at")
      .in("order_id", orderIds)
      .in("status", ["failed", "expired", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(cap);
    if (pErr || !pays?.length) return [];
    return pays.map((p) => ({
      paymentId: p.id,
      orderId: p.order_id,
      orderNumber: numMap.get(p.order_id) ?? "",
      status: p.status,
      gross_amount: p.gross_amount,
      created_at: p.created_at,
    }));
  } catch {
    return [];
  }
}

export type SpendingByMonth = {
  month: string; // "YYYY-MM"
  label: string; // e.g. "Jan 25"
  total: number;
};

export async function fetchSpendingByMonth(
  userId: string,
  months = 12,
): Promise<SpendingByMonth[]> {
  const cap = Math.min(Math.max(months, 3), 24);
  try {
    const supabase = await createClient();
    const WIB = 7 * 60 * 60 * 1000;
    const nowWIB = new Date(Date.now() + WIB);
    const sinceUTC = new Date(
      Date.UTC(nowWIB.getUTCFullYear(), nowWIB.getUTCMonth() - cap + 1, 1) - WIB,
    );

    const { data, error } = await supabase
      .from("orders")
      .select("total, created_at")
      .eq("user_id", userId)
      .in("status", ["paid", "processing", "shipped", "delivered", "completed"])
      .gte("created_at", sinceUTC.toISOString())
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const buckets = new Map<string, number>();
    for (let i = 0; i < cap; i++) {
      const d = new Date(Date.UTC(nowWIB.getUTCFullYear(), nowWIB.getUTCMonth() - cap + 1 + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, 0);
    }

    for (const row of data) {
      const dWIB = new Date(new Date(row.created_at).getTime() + WIB);
      const key = `${dWIB.getUTCFullYear()}-${String(dWIB.getUTCMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.total);
    }

    const SHORT_MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return Array.from(buckets.entries()).map(([key, total]) => {
      const [y, m] = key.split("-");
      const shortYear = String(y).slice(2);
      return { month: key, label: `${SHORT_MONTHS[parseInt(m, 10) - 1]} ${shortYear}`, total };
    });
  } catch {
    return [];
  }
}

export async function fetchCompletedOrdersCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchTotalSpending(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("total")
      .eq("user_id", userId)
      .in("status", ["paid", "processing", "shipped", "delivered", "completed"]);
    if (error || !data) return 0;
    return data.reduce((sum, o) => sum + (o.total ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function fetchPendingReviewsCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed");
    if (oErr || !orders?.length) return 0;

    const orderIds = orders.map((o) => o.id);
    const { data: reviewed, error: rErr } = await supabase
      .from("product_reviews")
      .select("order_id")
      .eq("user_id", userId)
      .in("order_id", orderIds);
    if (rErr) return 0;

    const reviewedSet = new Set((reviewed ?? []).map((r) => r.order_id));
    return orderIds.filter((id) => !reviewedSet.has(id)).length;
  } catch {
    return 0;
  }
}

export async function fetchReviewedProductIdsForOrder(
  userId: string,
  orderId: string,
): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .select("product_id")
      .eq("order_id", orderId)
      .eq("user_id", userId);
    if (error || !data) return [];
    return data.map((r) => r.product_id);
  } catch {
    return [];
  }
}

export type OrderReviewRow = {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
};

export async function fetchReviewsForOrder(
  userId: string,
  orderId: string,
): Promise<OrderReviewRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, product_id, rating, comment, is_approved, created_at")
      .eq("order_id", orderId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as OrderReviewRow[];
  } catch {
    return [];
  }
}
