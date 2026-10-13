import type { Metadata } from "next";

import { FlashSaleList } from "@/components/admin/promo/flash-sale-forms";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { listAdminFlashSales } from "@/server/queries/admin/promo";

export const metadata: Metadata = { title: "Flash sale" };
export const dynamic = "force-dynamic";

export default async function AdminFlashSalesPage() {
  await requireRole(["owner", "admin"]);
  const sales = await listAdminFlashSales();
  // eslint-disable-next-line react-hooks/purity -- status event dihitung per request
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Flash sale"
        description="Harga khusus dalam periode terbatas. Beranda menampilkan flash sale berjalan yang paling cepat berakhir."
      />
      <FlashSaleList sales={sales} now={now} />
    </div>
  );
}
