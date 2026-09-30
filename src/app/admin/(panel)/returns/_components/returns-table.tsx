"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu Kirim Balik",
  shipped_back: "Dikirim Pembeli",
  received: "Diterima",
  replacement_sent: "Penggantian Dikirim",
  completed: "Selesai",
};

type ReturnRow = {
  id: string;
  status: string;
  return_awb: string | null;
  created_at: string;
  complaints: { id: string; reason: string } | null;
  orders: { order_number: string } | null;
  profiles: { full_name: string | null } | null;
};

export function ReturnsTable({ rows }: { rows: ReturnRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[14px] text-muted-foreground">Belum ada pengajuan retur.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-[#e0e0e0] text-left text-[11px] font-semibold text-muted-foreground uppercase">
            <th className="pr-4 pb-3">No. Order</th>
            <th className="pr-4 pb-3">Pelanggan</th>
            <th className="pr-4 pb-3">Status</th>
            <th className="pr-4 pb-3">Dibuat</th>
            <th className="pb-3">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f0f0]">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-3 pr-4 font-mono text-[13px]">{r.orders?.order_number ?? "—"}</td>
              <td className="py-3 pr-4">{r.profiles?.full_name ?? "—"}</td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1 text-[11px] font-semibold">
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{formatDate(r.created_at)}</td>
              <td className="py-3">
                {r.complaints?.id && (
                  <Link
                    href={`/admin/complaints/${r.complaints.id}`}
                    className="admin-text-link text-[13px]"
                  >
                    Lihat komplain →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
