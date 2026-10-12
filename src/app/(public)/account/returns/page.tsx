import { RotateCcw } from "lucide-react";
import Link from "next/link";

import { dateShort } from "@/components/account/order-card";
import { StatusBadge } from "@/components/account/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CLAIM_STATUS_META, RETURN_STATUS_META } from "@/lib/orders/status";
import { listMyAfterSales } from "@/server/queries/account";

export const metadata = { title: "Retur & garansi" };

export default async function AccountReturnsPage() {
  const entries = await listMyAfterSales();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Retur & garansi"
        description="Ajukan retur atau klaim garansi dari halaman detail pesanan yang sudah diterima."
        className="pb-0"
      />
      {entries.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="Belum ada pengajuan"
          description="Retur dan klaim garansi yang kamu ajukan akan muncul di sini."
          action={{ label: "Lihat pesanan", href: "/account/orders?tab=completed" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => {
            const m = (e.kind === "return" ? RETURN_STATUS_META : CLAIM_STATUS_META)[e.status] ?? {
              label: e.status,
              tone: "neutral" as const,
            };
            return (
              <li
                key={`${e.kind}-${e.id}`}
                className="flex flex-col gap-2 rounded-xl border border-border p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{e.title}</span>
                  <StatusBadge label={m.label} tone={m.tone} />
                </div>
                <p className="text-caption text-muted-foreground">
                  {dateShort.format(new Date(e.createdAt))}
                  {e.orderNumber ? (
                    <>
                      {" · "}
                      <Link
                        href={`/account/orders/${e.orderNumber}`}
                        className="font-mono hover:underline"
                      >
                        {e.orderNumber}
                      </Link>
                    </>
                  ) : null}
                </p>
                {e.description ? <p className="text-muted-foreground">{e.description}</p> : null}
                {e.adminNote || e.resolution ? (
                  <p className="rounded-md bg-steel-50 p-3">
                    <span className="font-semibold">Tanggapan NZO:</span>{" "}
                    {e.resolution ?? e.adminNote}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
