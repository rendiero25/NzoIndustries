import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";

import { createClient, createServiceClient } from "@/lib/supabase/legacy/server";
import { formatRupiah, formatDate, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";
import { Button } from "@/components/ui/button";
import { CustomerEditDialog } from "../_components/customer-edit-dialog";
import { CustomerDeleteButton } from "../_components/customer-delete-button";

export const metadata: Metadata = { title: "Detail Pelanggan — Admin NZO Industries" };
export const dynamic = "force-dynamic";

const ORDERS_PER_PAGE = 10;
const PAID_STATUSES = ["paid", "processing", "shipped", "delivered", "completed"];

type OrderItem = { product_name: string; image_url: string | null; quantity: number };
type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminCustomerDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ordersPage = Math.max(1, parseInt(sp.page ?? "1", 10));
  const from = (ordersPage - 1) * ORDERS_PER_PAGE;
  const to = from + ORDERS_PER_PAGE - 1;

  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const [
    { data: profile },
    { data: authUser },
    ordersResult,
    { data: addresses },
    { data: statsOrders },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    serviceSupabase.auth.admin.getUserById(id),
    supabase
      .from("orders")
      .select(
        "id, order_number, status, total, created_at, order_items(product_name, image_url, quantity)",
        { count: "exact" },
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", id)
      .order("is_default", { ascending: false }),
    supabase.from("orders").select("status, total").eq("user_id", id),
  ]);

  if (!profile) notFound();

  const orders = (ordersResult.data ?? []) as Order[];
  const totalOrderCount = ordersResult.count ?? 0;
  const totalPages = Math.ceil(totalOrderCount / ORDERS_PER_PAGE);

  const email = authUser?.user?.email ?? null;
  const lastSignIn = authUser?.user?.last_sign_in_at ?? null;

  const totalSpent = (statsOrders ?? [])
    .filter((o) => PAID_STATUSES.includes(o.status))
    .reduce((sum, o) => sum + (o.total ?? 0), 0);
  const completedOrders = (statsOrders ?? []).filter((o) =>
    ["completed", "delivered"].includes(o.status),
  ).length;

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const labelClass = "text-[11px] font-semibold uppercase text-foreground";

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/customers" className="admin-text-link font-medium">
          Pelanggan
        </Link>
        <ChevronRight size={12} className="shrink-0 opacity-60" />
        <span className="font-semibold text-foreground">
          {profile.full_name ?? "Detail Pelanggan"}
        </span>
      </nav>

      {/* Title */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Pengguna</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">
            {profile.full_name ?? <span className="text-foreground italic">Belum diisi</span>}
          </h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            Bergabung{" "}
            {formatDate(profile.created_at, { day: "numeric", month: "long", year: "numeric" })}
            {lastSignIn ? ` · Login terakhir ${formatRelativeDate(lastSignIn)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex shrink-0 items-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground uppercase">
            {profile.role}
          </span>
          <CustomerEditDialog
            customerId={id}
            defaultValues={{ full_name: profile.full_name, phone: profile.phone }}
          />
          <CustomerDeleteButton customerId={id} customerName={profile.full_name} />
        </div>
      </div>

      {/* Profile + Info + Addresses — single card */}
      <div className="admin-utility-card overflow-hidden p-0">
        {/* Photo + contact + account info */}
        <div className="flex flex-wrap gap-6 p-6">
          {/* Avatar */}
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name ?? "Avatar"}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-semibold text-foreground">
                {initials}
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="min-w-[160px] flex-1 space-y-2">
            {email && (
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Mail size={13} className="shrink-0" />
                <span>{email}</span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Phone size={13} className="shrink-0" />
                <span>{profile.phone}</span>
              </div>
            )}
          </div>

          {/* Account info */}
          <div className="w-full space-y-2 text-xs sm:w-auto sm:min-w-[220px]">
            <div className="flex justify-between gap-4">
              <span className={labelClass}>User ID</span>
              <span className="text-right font-mono text-[10px] break-all">
                {profile.id.slice(0, 16)}…
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className={labelClass}>Role</span>
              <span className="font-semibold uppercase">{profile.role}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className={labelClass}>Bergabung</span>
              <span>{formatDate(profile.created_at)}</span>
            </div>
            {lastSignIn && (
              <div className="flex justify-between gap-4">
                <span className={labelClass}>Login Terakhir</span>
                <span>{formatRelativeDate(lastSignIn)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Addresses */}
        {addresses && addresses.length > 0 && (
          <div className="border-t border-border">
            <p className="px-6 py-3 text-[11px] font-semibold text-foreground uppercase">
              Alamat Tersimpan ({addresses.length})
            </p>
            <div className="grid gap-px bg-steel-200 sm:grid-cols-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="bg-background px-6 py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{addr.recipient}</p>
                    {addr.is_default && (
                      <span className="shrink-0 rounded-md border border-border px-1.5 py-0 text-[9px] font-semibold text-foreground uppercase">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-foreground">{addr.phone}</p>
                  <div className="mt-1 flex items-start gap-1 text-xs text-foreground">
                    <MapPin size={11} className="mt-0.5 shrink-0" />
                    <span>
                      {addr.full_address}, {addr.district}, {addr.city}, {addr.province}{" "}
                      {addr.postal_code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatCard label="Total Order" value={String(totalOrderCount)} />
          <StatCard label="Order Selesai" value={String(completedOrders)} />
          <StatCard label="Total Belanja" value={formatRupiah(totalSpent, true)} />
        </div>
      </div>

      {/* Riwayat Pesanan */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Riwayat Pesanan ({totalOrderCount})</h2>
        </div>

        {orders.length > 0 ? (
          <>
            <div className="divide-y divide-border">
              {orders.map((order) => {
                const first = order.order_items[0] ?? null;
                const extraCount = order.order_items.length - 1;

                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    {/* Product image */}
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {first?.image_url ? (
                        <Image
                          src={first.image_url}
                          alt={first.product_name}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag size={16} className="text-foreground" />
                        </div>
                      )}
                      {extraCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                          <span className="text-[10px] font-bold text-white">+{extraCount}</span>
                        </div>
                      )}
                    </div>

                    {/* Product name + order number */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {first?.product_name ?? "—"}
                        {extraCount > 0 && (
                          <span className="ml-1 text-xs font-normal text-foreground">
                            +{extraCount} lainnya
                          </span>
                        )}
                      </p>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="admin-text-link font-mono text-[11px] font-semibold"
                      >
                        {order.order_number}
                      </Link>
                    </div>

                    {/* Status + total + detail */}
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "hidden rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase sm:inline-block",
                          adminOrderStatusBadgeClass(order.status),
                        )}
                      >
                        {ADMIN_ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="text-xs font-semibold">{formatRupiah(order.total)}</span>
                      <Button asChild variant="dark" size="sm">
                        <Link href={`/admin/orders/${order.id}`}>Detail</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-foreground">
                  Halaman {ordersPage} dari {totalPages}
                </p>
                <div className="flex gap-1">
                  <PaginationLink
                    href={`/admin/customers/${id}?page=${ordersPage - 1}`}
                    disabled={ordersPage <= 1}
                  >
                    <ChevronLeft size={14} />
                  </PaginationLink>
                  <PaginationLink
                    href={`/admin/customers/${id}?page=${ordersPage + 1}`}
                    disabled={ordersPage >= totalPages}
                  >
                    <ChevronRight size={14} />
                  </PaginationLink>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-foreground">
            <ShoppingBag size={28} strokeWidth={1} />
            <p className="text-xs font-semibold uppercase">Belum ada pesanan</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black px-4 py-6 text-center text-white">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-[10px] font-medium text-white">{label}</p>
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-lg border border-border p-2 opacity-40">{children}</span>;
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-border p-2 transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}
