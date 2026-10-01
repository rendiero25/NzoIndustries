"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/client";
import { formatRupiah, formatRelativeDate } from "@/lib/format";
import { useAdminOrdersStore } from "@/store/admin-orders-store";

type UnviewedOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  recipient_name: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

export function AdminNewOrdersSection() {
  const [orders, setOrders] = useState<UnviewedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const setCount = useAdminOrdersStore((s) => s.setCount);
  const increment = useAdminOrdersStore((s) => s.increment);
  const decrement = useAdminOrdersStore((s) => s.decrement);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch("/api/admin/orders/unviewed")
      .then((r) => r.json())
      .then((json: { items: UnviewedOrder[]; count: number }) => {
        setOrders(json.items ?? []);
        setCount(json.count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setCount]);

  // Realtime: new order INSERT → prepend; admin views order UPDATE → remove.
  // getSession() waits for session cookie load so realtime connects with the
  // admin JWT (not anon) and passes the is_admin() RLS check.
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel("admin-new-orders-section")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload) => {
            const o = payload.new as UnviewedOrder;
            setOrders((prev) => [o, ...prev].slice(0, 10));
            increment();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders" },
          (payload) => {
            const updated = payload.new as UnviewedOrder & { admin_viewed_at: string | null };
            if (updated.admin_viewed_at !== null) {
              setOrders((prev) => {
                const existed = prev.some((o) => o.id === updated.id);
                if (existed) decrement();
                return prev.filter((o) => o.id !== updated.id);
              });
            }
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [increment, decrement]);

  if (loading || orders.length === 0) return null;

  return (
    <Card className="border-[#EA5329]/20 bg-[#EA5329]/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EA5329]/10">
              <ShoppingBag className="h-4 w-4 text-[#EA5329]" />
            </span>
            <div>
              <CardTitle className="text-[15px]">
                {orders.length === 1 ? "1 pesanan baru" : `${orders.length} pesanan baru`}
              </CardTitle>
              <CardDescription className="text-[12px]">Belum dilihat</CardDescription>
            </div>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[12px] text-[#EA5329] hover:bg-[#EA5329]/10 hover:text-[#EA5329]"
          >
            <Link href="/admin/orders">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-[#EA5329]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold">{o.order_number}</span>
                  <Badge
                    className={`shrink-0 rounded-full px-2 py-0 text-[10px] font-semibold ${STATUS_BADGE[o.status] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {o.recipient_name ?? "—"} · {formatRelativeDate(o.created_at)}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatRupiah(o.total, true)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
