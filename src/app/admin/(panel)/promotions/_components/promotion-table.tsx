"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { togglePromotionActive, deletePromotion, type PromotionType } from "../_actions";

import { useConfirm } from "@/hooks/use-confirm";

export type PromotionTableRow = {
  id: string;
  type: PromotionType;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  created_at: string;
  product_count: number;
  brand_count: number;
};

interface PromotionTableProps {
  rows: PromotionTableRow[];
  basePath: string;
  emptyLabel: string;
}

function RowActions({ row, basePath }: { row: PromotionTableRow; basePath: string }) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await togglePromotionActive(row.id, row.type, !row.is_active);
      if (error) toast.error(error);
      else toast.success(row.is_active ? "Promosi dinonaktifkan." : "Promosi diaktifkan.");
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Hapus promosi ini?",
      description: "Tindakan tidak bisa dibatalkan.",
    });
    if (!ok) return;
    startTransition(async () => {
      const { error } = await deletePromotion(row.id, row.type);
      if (error) toast.error(error);
      else toast.success("Promosi dihapus.");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminTableEditLink href={`${basePath}/${row.id}`} appearance="filled">
        Edit
      </AdminTableEditLink>
      {dialog}
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
      <StatusPillToggle
        active={row.is_active}
        onToggle={handleToggle}
        activeLabel="Aktif"
        inactiveLabel="Nonaktif"
        disabled={isPending}
        size="compact"
      />
    </div>
  );
}

export function PromotionTable({ rows, basePath, emptyLabel }: PromotionTableProps) {
  if (rows.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <p className="text-sm font-semibold uppercase">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Judul
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                Pilihan Produk
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                Maks. Item
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="font-semibold text-foreground transition-colors hover:text-brand"
                  >
                    {row.title}
                  </Link>
                  {row.subtitle && (
                    <p className="max-w-[220px] truncate text-xs text-foreground">{row.subtitle}</p>
                  )}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs text-foreground">
                    {row.selection_mode === "brand"
                      ? `${row.brand_count} brand`
                      : `${row.product_count} produk`}
                  </span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-xs font-medium">{row.max_items}</span>
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={row.is_active} />
                </td>
                <td className="px-4 py-3">
                  <RowActions row={row} basePath={basePath} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
