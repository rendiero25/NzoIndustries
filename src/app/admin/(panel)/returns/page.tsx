import { createServiceClient } from "@/lib/supabase/server";
import { ReturnsTable } from "./_components/returns-table";

export default async function AdminReturnsPage() {
  const supabase = await createServiceClient();
  const { data: rows } = await supabase
    .from("returns")
    .select(
      `
      id, status, return_awb, created_at,
      complaints(id, reason),
      orders(order_number),
      profiles(full_name)
    `,
    )
    .order("created_at", { ascending: false });

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Layanan</p>
        <h1 className="text-[34px] font-semibold uppercase">Pengajuan Retur</h1>
      </div>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Semua Retur ({rows?.length ?? 0})</h2>
        </div>
        <div className="p-6">
          <ReturnsTable rows={rows ?? []} />
        </div>
      </div>
    </div>
  );
}
