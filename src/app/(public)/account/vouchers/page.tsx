import { Ticket } from "lucide-react";
import Link from "next/link";

import { dateShort } from "@/components/account/order-card";
import { VoucherList } from "@/components/account/voucher-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatIDR } from "@/lib/money";
import { getMyVouchers } from "@/server/queries/account";

export const metadata = { title: "Voucher" };

export default async function AccountVouchersPage() {
  const { available, history } = await getMyVouchers();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Voucher"
        description="Pakai kode voucher di langkah voucher saat checkout."
        className="pb-0"
      />

      <section aria-labelledby="available" className="flex flex-col gap-3">
        <h2 id="available" className="text-base">
          Voucher tersedia
        </h2>
        {available.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="Belum ada voucher"
            description="Voucher promo akan muncul di sini."
          />
        ) : (
          <VoucherList vouchers={available} />
        )}
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-base">
          Riwayat pemakaian
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Kamu belum pernah memakai voucher.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {history.map((h) => (
              <li
                key={`${h.code}-${h.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
              >
                <span className="flex flex-col">
                  <span className="font-mono font-semibold">{h.code}</span>
                  <span className="text-caption text-muted-foreground">
                    {dateShort.format(new Date(h.usedAt))} ·{" "}
                    <Link
                      href={`/account/orders/${h.orderNumber}`}
                      className="font-mono hover:underline"
                    >
                      {h.orderNumber}
                    </Link>
                  </span>
                </span>
                <span className="text-success tabular-nums">−{formatIDR(h.discountAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
