import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchComplaintForOrder } from "@/lib/data/complaints";

const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu pengiriman balik",
  shipped_back: "Barang dalam perjalanan ke NZO Industries",
  received: "Barang diterima, penggantian sedang disiapkan",
  replacement_sent: "Produk pengganti sedang dikirim",
  completed: "Retur selesai",
};

export default async function OrderReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/return`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const complaint = await fetchComplaintForOrder(id);
  const ret = complaint?.return;
  if (!ret) redirect(`/dashboard/orders/${id}/complaint`);

  const shipment = ret.return_shipments[0] ?? null;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/orders/${id}/complaint`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-2 hover:underline"
      >
        <ArrowLeft size={13} /> Kembali ke komplain
      </Link>

      <div className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
        <h1 className="text-[22px] font-semibold">Status Retur</h1>
        <p className="text-[15px] text-steel-700">
          {RETURN_STATUS_LABELS[ret.status] ?? ret.status}
        </p>

        {ret.return_awb && (
          <div className="space-y-1 rounded-lg bg-muted p-4 text-[13px]">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              Resi pengiriman balik Anda
            </p>
            <p className="font-medium">{ret.return_courier}</p>
            <p className="font-mono text-foreground">{ret.return_awb}</p>
          </div>
        )}

        {shipment && (
          <div className="space-y-1 rounded-lg border border-border p-4 text-[13px]">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              Pengiriman penggantian
            </p>
            <p className="font-medium">{shipment.courier}</p>
            {shipment.awb_number && (
              <p className="font-mono text-[15px] font-semibold text-foreground">
                {shipment.awb_number}
              </p>
            )}
            {shipment.status && <p className="text-muted-foreground">Status: {shipment.status}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
