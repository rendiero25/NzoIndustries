"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { Button } from "@/components/ui/button";
import { toggleFlashSaleActive, deleteFlashSale } from "../_actions";

export type FlashSaleRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  product_count: number;
};

interface FlashSaleTableProps {
  flashSales: FlashSaleRow[];
}

function getStatus(sale: FlashSaleRow): { label: string; className: string } {
  const now = new Date();
  const starts = new Date(sale.starts_at);
  const ends = new Date(sale.ends_at);

  if (!sale.is_active) {
    return { label: "Nonaktif", className: "bg-muted text-foreground" };
  }
  if (now < starts) {
    return { label: "Terjadwal", className: "bg-brand/10 text-brand" };
  }
  if (now >= starts && now <= ends) {
    return {
      label: "Berlangsung",
      className: "bg-emerald-500/15 text-emerald-800",
    };
  }
  return { label: "Berakhir", className: "bg-muted text-foreground" };
}

function FlashSaleActions({ sale }: { sale: FlashSaleRow }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getStatus(sale);

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleFlashSaleActive(sale.id, !sale.is_active);
      if (error) toast.error(error);
      else toast.success(sale.is_active ? "Flash sale dinonaktifkan." : "Flash sale diaktifkan.");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const { error } = await deleteFlashSale(sale.id);
      if (error) toast.error(error);
      else toast.success("Flash sale dihapus.");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminTableEditLink href={`/admin/promotions/flash-sale/${sale.id}`} appearance="filled">
        Edit
      </AdminTableEditLink>

      {confirmDelete ? (
        <>
          <span className="text-[10px] font-semibold text-destructive uppercase">Yakin hapus?</span>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={handleDelete}

            loading={isPending}
          >
            Ya, Hapus
          </Button>
          <Button
            type="button"
            variant="table-action"
            size="xs"
            onClick={() => setConfirmDelete(false)}
            disabled={isPending}
          >
            Batal
          </Button>
        </>
      ) : (
        <AdminTableDeleteButton onClick={() => setConfirmDelete(true)} disabled={isPending}>
          Hapus
        </AdminTableDeleteButton>
      )}

      <Button
        type="button"
        variant="table-action"
        size="xs"
        onClick={handleToggle}
        disabled={isPending}
        className={status.className}
      >
        {status.label}
      </Button>
    </div>
  );
}

export function FlashSaleTable({ flashSales }: FlashSaleTableProps) {
  if (flashSales.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <Zap size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada flash sale</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Nama
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                Mulai
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                Berakhir
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                Produk
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {flashSales.map((sale) => {
              const status = getStatus(sale);
              return (
                <tr key={sale.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/promotions/flash-sale/${sale.id}`}
                      className="font-semibold text-foreground transition-colors hover:text-brand"
                    >
                      {sale.name}
                    </Link>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-foreground">{formatDate(sale.starts_at)}</span>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-foreground">{formatDate(sale.ends_at)}</span>
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-xs font-medium">{sale.product_count} produk</span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <FlashSaleActions sale={sale} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
