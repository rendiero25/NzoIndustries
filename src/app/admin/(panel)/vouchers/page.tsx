import type { Metadata } from "next";

import { VoucherManager } from "@/components/admin/promo/voucher-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { listAdminVouchers } from "@/server/queries/admin/promo";

export const metadata: Metadata = { title: "Voucher" };
export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  await requireRole(["owner", "admin"]);
  const vouchers = await listAdminVouchers();
  // eslint-disable-next-line react-hooks/purity -- status voucher dihitung per request
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Voucher"
        description="Kode potongan belanja. Diskon produk/kategori diatur lewat harga coret di halaman Produk."
      />
      <VoucherManager vouchers={vouchers} now={now} />
    </div>
  );
}
