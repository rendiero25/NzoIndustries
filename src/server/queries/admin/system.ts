import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ReportRange } from "@/lib/validations/admin-system";

// ---------------------------------------------------------------- laporan

export type SalesReport = {
  totals: {
    orders: number;
    revenue: number;
    subtotal: number;
    shipping: number;
    discount: number;
    items: number;
  };
  series: { period: string; revenue: number; orders: number }[];
  products: { productId: string | null; name: string; qty: number; revenue: number }[];
  categories: { name: string; qty: number; revenue: number }[];
  payments: { method: string; orders: number; revenue: number }[];
};

type RawReport = {
  totals: Record<string, number>;
  series: { period: string; revenue: number; orders: number }[];
  products: { product_id: string | null; name: string; qty: number; revenue: number }[];
  categories: { name: string; qty: number; revenue: number }[];
  payments: { method: string; orders: number; revenue: number }[];
};

/** Laporan penjualan (RPC `admin_sales_report`, owner/admin). */
export async function getSalesReport(range: ReportRange): Promise<SalesReport> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_sales_report", {
    p_from: range.from,
    p_to: range.to,
    p_group: range.group,
  });
  if (error) throw new Error(`sales report: ${error.message}`);
  const r = data as unknown as RawReport;
  const n = (v: unknown) => Number(v ?? 0);
  return {
    totals: {
      orders: n(r.totals?.orders),
      revenue: n(r.totals?.revenue),
      subtotal: n(r.totals?.subtotal),
      shipping: n(r.totals?.shipping),
      discount: n(r.totals?.discount),
      items: n(r.totals?.items),
    },
    series: (r.series ?? []).map((s) => ({
      period: s.period,
      revenue: n(s.revenue),
      orders: n(s.orders),
    })),
    products: (r.products ?? []).map((p) => ({
      productId: p.product_id,
      name: p.name,
      qty: n(p.qty),
      revenue: n(p.revenue),
    })),
    categories: (r.categories ?? []).map((c) => ({
      name: c.name,
      qty: n(c.qty),
      revenue: n(c.revenue),
    })),
    payments: (r.payments ?? []).map((p) => ({
      method: p.method,
      orders: n(p.orders),
      revenue: n(p.revenue),
    })),
  };
}

// ---------------------------------------------------------------- staf

export type StaffMember = {
  id: string;
  fullName: string | null;
  email: string;
  role: "owner" | "admin" | "warehouse" | "cs" | "customer";
  isBlocked: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

export async function listStaff(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_staff_list");
  if (error) throw new Error(`staff: ${error.message}`);
  return (data ?? []).map((s) => ({
    id: s.id,
    fullName: s.full_name,
    email: s.email,
    role: s.role,
    isBlocked: s.is_blocked,
    createdAt: s.created_at,
    lastSignInAt: s.last_sign_in_at,
  }));
}

// ---------------------------------------------------------------- audit log

export const AUDIT_PER_PAGE = 30;

export type AuditEntry = {
  id: number;
  actor: string;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export async function listAuditLogs(filters: {
  entity?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  page: number;
}): Promise<{ rows: AuditEntry[]; total: number }> {
  const supabase = await createClient();
  let q = supabase
    .from("audit_logs")
    .select(
      "id, actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, created_at",
      {
        count: "exact",
      },
    )
    .order("created_at", { ascending: false })
    .range((filters.page - 1) * AUDIT_PER_PAGE, filters.page * AUDIT_PER_PAGE - 1);
  if (filters.entity) q = q.eq("entity_type", filters.entity);
  if (filters.action) q = q.eq("action", filters.action);
  if (filters.actor) q = q.eq("actor_id", filters.actor);
  if (filters.from)
    q = q.gte("created_at", new Date(`${filters.from}T00:00:00+07:00`).toISOString());
  if (filters.to)
    q = q.lt(
      "created_at",
      new Date(new Date(`${filters.to}T00:00:00+07:00`).getTime() + 86_400_000).toISOString(),
    );
  const { data, error, count } = await q;
  if (error) throw new Error(`audit: ${error.message}`);

  const actorIds = [
    ...new Set((data ?? []).map((r) => r.actor_id).filter((v): v is string => !!v)),
  ];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameOf = new Map((actors ?? []).map((a) => [a.id, a.full_name]));

  return {
    total: count ?? 0,
    rows: (data ?? []).map((r) => ({
      id: Number(r.id),
      actor: r.actor_id ? nameOf.get(r.actor_id)?.trim() || "Staf" : "Sistem",
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      before: r.before_data,
      after: r.after_data,
      createdAt: r.created_at,
    })),
  };
}

// ---------------------------------------------------------------- pengaturan

export type StoreSettings = {
  storeName: string;
  supportEmail: string | null;
  supportWhatsapp: string | null;
  mayarEnabled: boolean;
  paymentTimeoutMinutes: number;
  lowStockThreshold: number;
  returnWindowDays: number;
  requireStaffMfa: boolean;
  shipper: {
    name: string | null;
    phone: string | null;
    address: string | null;
    postalCode: string | null;
    areaId: string | null;
  };
  updatedAt: string;
};

export async function getStoreSettings(): Promise<StoreSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select(
      "store_name, support_email, support_whatsapp, mayar_enabled, payment_timeout_minutes, low_stock_threshold, return_window_days, require_staff_mfa, shipper, updated_at",
    )
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(`settings: ${error.message}`);
  if (!data) return null;
  const s = (data.shipper ?? {}) as Record<string, string | null | undefined>;
  return {
    storeName: data.store_name,
    supportEmail: data.support_email,
    supportWhatsapp: data.support_whatsapp,
    mayarEnabled: data.mayar_enabled,
    paymentTimeoutMinutes: data.payment_timeout_minutes,
    lowStockThreshold: data.low_stock_threshold,
    returnWindowDays: data.return_window_days,
    requireStaffMfa: data.require_staff_mfa,
    shipper: {
      name: s.name ?? null,
      phone: s.phone ?? null,
      address: s.address ?? null,
      postalCode: s.postal_code ?? null,
      areaId: s.area_id ?? null,
    },
    updatedAt: data.updated_at,
  };
}

// ---------------------------------------------------------------- notifikasi staf

export type StaffNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listStaffNotifications(userId: string): Promise<StaffNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`notifications: ${error.message}`);
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}
