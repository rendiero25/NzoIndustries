"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminTableDetailLink } from "@/components/admin/admin-table-row-actions";
import { Button } from "@/components/ui/button";

const RESOLUTION_TYPE_LABEL: Record<string, string> = {
  return: "Tukar barang",
  product: "Lainnya",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Baru",
    className: "bg-brand/10 text-brand",
  },
  in_review: {
    label: "Ditinjau",
    className: "bg-muted text-foreground",
  },
  resolved: {
    label: "Selesai",
    className: "bg-emerald-500/15 text-emerald-800",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-muted text-foreground",
  },
};

export type ComplaintRow = {
  id: string;
  type: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  orders: { order_number: string } | null;
  profiles: { full_name: string | null } | null;
};

interface ComplaintTableProps {
  complaints: ComplaintRow[];
  page: number;
  totalPages: number;
}

export function ComplaintTable({ complaints, page, totalPages }: ComplaintTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (complaints.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <FileText size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada komplain</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  No. Order
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                  Tipe
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase lg:table-cell">
                  Alasan
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {complaints.map((complaint) => {
                const statusCfg = STATUS_CONFIG[complaint.status] ?? {
                  label: complaint.status,
                  className: "bg-muted text-foreground",
                };

                return (
                  <tr key={complaint.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="text-base font-medium">
                        {complaint.profiles?.full_name ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold">
                        {complaint.orders?.order_number ?? "—"}
                      </span>
                    </td>

                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-foreground">
                        {RESOLUTION_TYPE_LABEL[complaint.type] ?? complaint.type}
                      </span>
                    </td>

                    <td className="hidden px-4 py-3 lg:table-cell">
                      <p className="line-clamp-1 max-w-xs text-xs text-foreground">
                        {complaint.reason}
                      </p>
                    </td>

                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-xs text-foreground">
                        {formatRelativeDate(complaint.created_at)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                          statusCfg.className,
                        )}
                      >
                        {statusCfg.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <AdminTableDetailLink href={`/admin/complaints/${complaint.id}`}>
                        Detail
                      </AdminTableDetailLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
