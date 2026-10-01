import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { InvoicePrintView } from "@/components/dashboard/invoice-print-view";
import type { Database } from "@/types/legacy-supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type WatermarkType = "LUNAS" | "DIBATALKAN" | "DIKEMBALIKAN";

function resolveWatermark(status: OrderStatus): WatermarkType {
  if (status === "cancelled") return "DIBATALKAN";
  if (status === "refunded") return "DIKEMBALIKAN";
  return "LUNAS";
}

export default async function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/invoice`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { order, items, payments } = detail;
  const paidPayment = payments.find((p) => p.status === "paid");

  if (!paidPayment) {
    return (
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-8 text-center">
        <p className="text-base font-semibold text-[#1d1d1f]">Invoice belum tersedia</p>
        <p className="mt-2 text-sm text-[#7a7a7a]">
          Invoice hanya tersedia setelah pembayaran dikonfirmasi.
        </p>
      </div>
    );
  }

  const watermark = resolveWatermark(order.status);

  return (
    <InvoicePrintView order={order} items={items} paidPayment={paidPayment} watermark={watermark} />
  );
}
