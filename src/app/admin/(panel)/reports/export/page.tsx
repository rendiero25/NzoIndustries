"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Users, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportType = "orders" | "customers" | "revenue";

const EXPORTS: {
  type: ExportType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    type: "orders",
    label: "Export Pesanan",
    description:
      "Seluruh data pesanan: nomor order, status, nama penerima, total, ongkir, diskon, dan tanggal.",
    icon: FileSpreadsheet,
  },
  {
    type: "customers",
    label: "Export Pelanggan",
    description: "Daftar semua pelanggan terdaftar beserta tanggal bergabung.",
    icon: Users,
  },
  {
    type: "revenue",
    label: "Export Revenue",
    description: "Revenue harian dari pesanan yang sudah dibayar, dikelompokkan per hari.",
    icon: TrendingUp,
  },
];

export default function ExportPage() {
  const [loading, setLoading] = useState<ExportType | null>(null);

  const handleDownload = async (type: ExportType) => {
    setLoading(type);
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (!res.ok) {
        throw new Error("Export gagal");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/);
      a.download = match?.[1] ?? `export-${type}.csv`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // noop — user will see loading reset
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Analitik</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Export Data</h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            Unduh data dalam format CSV
          </p>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/reports">
            <ArrowLeft size={13} />
            Kembali
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {EXPORTS.map(({ type, label, description, icon: Icon }) => (
          <div key={type} className="admin-utility-card flex flex-col gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Icon size={18} className="text-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold uppercase">{label}</p>
              <p className="text-xs leading-relaxed text-foreground">{description}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full gap-2"
              onClick={() => void handleDownload(type)}
              disabled={loading !== null}
            >
              {loading === type ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
              ) : (
                <Download size={13} />
              )}
              {loading === type ? "Mengunduh..." : "Unduh CSV"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
