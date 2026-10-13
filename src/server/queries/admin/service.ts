import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CustomerSegment } from "@/lib/validations/admin-service";

// ---------------------------------------------------------------- pelanggan

export const CUSTOMERS_PER_PAGE = 25;

export type AdminCustomer = {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  isBlocked: boolean;
  createdAt: string;
  deletedAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  is_blocked: boolean;
  created_at: string;
  deleted_at: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  total_count: number;
};

function toCustomer(r: CustomerRow): AdminCustomer {
  return {
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    isBlocked: r.is_blocked,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
    orderCount: Number(r.order_count),
    totalSpent: Number(r.total_spent),
    lastOrderAt: r.last_order_at,
  };
}

/** Daftar pelanggan + agregat belanja (RPC `admin_customers`, owner/admin/cs). */
export async function listAdminCustomers(params: {
  q?: string;
  segment?: CustomerSegment;
  page: number;
}): Promise<{ rows: AdminCustomer[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customers", {
    p_q: params.q?.slice(0, 80) || undefined,
    p_segment: params.segment,
    p_limit: CUSTOMERS_PER_PAGE,
    p_offset: (params.page - 1) * CUSTOMERS_PER_PAGE,
  });
  if (error) throw new Error(`customers: ${error.message}`);
  const rows = (data ?? []) as CustomerRow[];
  return { rows: rows.map(toCustomer), total: rows.length ? Number(rows[0]!.total_count) : 0 };
}

export type AdminCustomerDetail = AdminCustomer & {
  addresses: {
    id: string;
    label: string | null;
    recipient: string;
    phone: string;
    line: string;
    isDefault: boolean;
  }[];
  orders: { orderNumber: string; status: string; grandTotal: number; createdAt: string }[];
};

export async function getAdminCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: addresses }, { data: orders }] = await Promise.all([
    supabase.rpc("admin_customers", { p_user: id, p_limit: 1 }),
    supabase
      .from("addresses")
      .select(
        "id, label, recipient, phone, full_address, district, city, province, postal_code, is_default",
      )
      .eq("user_id", id)
      .order("is_default", { ascending: false }),
    supabase
      .from("orders")
      .select("order_number, status, grand_total, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (error) throw new Error(`customer: ${error.message}`);
  const row = ((rows ?? []) as CustomerRow[])[0];
  if (!row) return null;
  return {
    ...toCustomer(row),
    addresses: (addresses ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      line: [a.full_address, a.district, a.city, a.province, a.postal_code]
        .filter(Boolean)
        .join(", "),
      isDefault: a.is_default,
    })),
    orders: (orders ?? []).map((o) => ({
      orderNumber: o.order_number,
      status: o.status,
      grandTotal: Number(o.grand_total),
      createdAt: o.created_at,
    })),
  };
}

// ---------------------------------------------------------------- ulasan

export const REVIEWS_PER_PAGE = 20;

export type AdminReview = {
  id: string;
  productName: string;
  productSlug: string;
  reviewer: string;
  rating: number;
  comment: string | null;
  imageUrls: string[];
  status: "pending" | "published" | "hidden";
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export async function listAdminReviews(params: {
  status?: string;
  rating?: number;
  page: number;
}): Promise<{ rows: AdminReview[]; total: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("reviews")
    .select(
      "id, rating, comment, image_paths, status, reply, replied_at, created_at, product:products(name, slug), author:profiles!reviews_user_id_fkey(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((params.page - 1) * REVIEWS_PER_PAGE, params.page * REVIEWS_PER_PAGE - 1);
  if (params.status === "pending" || params.status === "published" || params.status === "hidden") {
    query = query.eq("status", params.status);
  }
  if (params.rating && params.rating >= 1 && params.rating <= 5)
    query = query.eq("rating", params.rating);
  const { data, error, count } = await query;
  if (error) throw new Error(`reviews: ${error.message}`);
  const storage = supabase.storage.from("review-images");
  return {
    total: count ?? 0,
    rows: (data ?? []).map((r) => ({
      id: r.id,
      productName: r.product?.name ?? "(produk dihapus)",
      productSlug: r.product?.slug ?? "",
      reviewer: r.author?.full_name?.trim() || "Pelanggan",
      rating: r.rating,
      comment: r.comment,
      imageUrls: (r.image_paths ?? []).map((p) => storage.getPublicUrl(p).data.publicUrl),
      status: r.status,
      reply: r.reply,
      repliedAt: r.replied_at,
      createdAt: r.created_at,
    })),
  };
}

// ---------------------------------------------------------------- retur & klaim

export const AFTER_SALES_PER_PAGE = 20;

export type AdminAfterSales = {
  id: string;
  kind: "return" | "claim";
  orderNumber: string | null;
  productName: string | null;
  customer: string;
  customerId: string;
  reason: string | null;
  description: string | null;
  status: string;
  adminNote: string | null;
  resolution: string | null;
  returnAwb: string | null;
  mediaPaths: string[];
  createdAt: string;
};

const RETURN_SELECT =
  "id, user_id, reason, description, status, admin_note, resolution, return_awb, media_paths, created_at, order:orders(order_number), item:order_items(product_name), author:profiles!returns_user_id_fkey(full_name)";
const CLAIM_SELECT =
  "id, user_id, description, status, admin_note, resolution, media_paths, created_at, item:order_items(product_name, order:orders(order_number)), author:profiles!warranty_claims_user_id_fkey(full_name)";

/** Retur + klaim garansi digabung, terbaru dulu (maks 200 per jenis). */
export async function listAdminAfterSales(params: {
  kind?: "return" | "claim";
  status?: string;
}): Promise<AdminAfterSales[]> {
  const supabase = await createClient();
  const wantReturns = params.kind !== "claim";
  const wantClaims = params.kind !== "return";
  const [returns, claims] = await Promise.all([
    wantReturns
      ? (() => {
          let q = supabase
            .from("returns")
            .select(RETURN_SELECT)
            .order("created_at", { ascending: false })
            .limit(200);
          if (params.status) q = q.eq("status", params.status as "requested");
          return q;
        })()
      : Promise.resolve({ data: [], error: null }),
    wantClaims
      ? (() => {
          let q = supabase
            .from("warranty_claims")
            .select(CLAIM_SELECT)
            .order("created_at", { ascending: false })
            .limit(200);
          if (params.status) q = q.eq("status", params.status as "submitted");
          return q;
        })()
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (returns.error) throw new Error(`returns: ${returns.error.message}`);
  if (claims.error) throw new Error(`claims: ${claims.error.message}`);
  const rows: AdminAfterSales[] = [
    ...(returns.data ?? []).map((r) => ({
      id: r.id,
      kind: "return" as const,
      orderNumber: r.order?.order_number ?? null,
      productName: r.item?.product_name ?? null,
      customer: r.author?.full_name?.trim() || "Pelanggan",
      customerId: r.user_id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      adminNote: r.admin_note,
      resolution: r.resolution,
      returnAwb: r.return_awb,
      mediaPaths: r.media_paths ?? [],
      createdAt: r.created_at,
    })),
    ...(claims.data ?? []).map((c) => ({
      id: c.id,
      kind: "claim" as const,
      orderNumber: c.item?.order?.order_number ?? null,
      productName: c.item?.product_name ?? null,
      customer: c.author?.full_name?.trim() || "Pelanggan",
      customerId: c.user_id,
      reason: null,
      description: c.description,
      status: c.status,
      adminNote: c.admin_note,
      resolution: c.resolution,
      returnAwb: null,
      mediaPaths: c.media_paths ?? [],
      createdAt: c.created_at,
    })),
  ];
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAdminAfterSales(
  kind: "return" | "claim",
  id: string,
): Promise<
  (AdminAfterSales & { media: { path: string; url: string | null; isVideo: boolean }[] }) | null
> {
  const supabase = await createClient();
  const { data, error } =
    kind === "return"
      ? await supabase.from("returns").select(RETURN_SELECT).eq("id", id).maybeSingle()
      : await supabase.from("warranty_claims").select(CLAIM_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`after-sales: ${error.message}`);
  if (!data) return null;
  const row =
    kind === "return"
      ? (() => {
          const r = data as unknown as {
            id: string;
            user_id: string;
            reason: string;
            description: string | null;
            status: string;
            admin_note: string | null;
            resolution: string | null;
            return_awb: string | null;
            media_paths: string[] | null;
            created_at: string;
            order: { order_number: string } | null;
            item: { product_name: string } | null;
            author: { full_name: string | null } | null;
          };
          return {
            ...r,
            orderNumber: r.order?.order_number ?? null,
            productName: r.item?.product_name ?? null,
            returnAwb: r.return_awb,
          };
        })()
      : (() => {
          const c = data as unknown as {
            id: string;
            user_id: string;
            description: string | null;
            status: string;
            admin_note: string | null;
            resolution: string | null;
            media_paths: string[] | null;
            created_at: string;
            item: { product_name: string; order: { order_number: string } | null } | null;
            author: { full_name: string | null } | null;
          };
          return {
            ...c,
            orderNumber: c.item?.order?.order_number ?? null,
            productName: c.item?.product_name ?? null,
            reason: null,
            returnAwb: null,
          };
        })();

  // Media privat: signed URL 5 menit (security rule 10), dibuat dengan sesi staf.
  const paths = row.media_paths ?? [];
  const signed = paths.length
    ? ((await supabase.storage.from("after-sales-media").createSignedUrls(paths, 300)).data ?? [])
    : [];
  return {
    id: row.id,
    kind,
    orderNumber: row.orderNumber,
    productName: row.productName,
    customer: row.author?.full_name?.trim() || "Pelanggan",
    customerId: row.user_id,
    reason: row.reason,
    description: row.description,
    status: row.status,
    adminNote: row.admin_note,
    resolution: row.resolution,
    returnAwb: row.returnAwb,
    mediaPaths: paths,
    createdAt: row.created_at,
    media: paths.map((p) => ({
      path: p,
      url: signed.find((s) => s.path === p)?.signedUrl ?? null,
      isVideo: /\.(mp4|mov|webm)$/i.test(p),
    })),
  };
}
