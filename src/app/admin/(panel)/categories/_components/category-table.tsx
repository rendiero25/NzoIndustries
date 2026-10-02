"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CornerDownRight, Grid2X2 } from "lucide-react";
import { toast } from "sonner";

import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { deleteCategory, toggleCategoryStatus } from "../_actions";
import type { CategoryRow, FlatCategoryRow } from "../_lib/flat-category-tree";

export type { CategoryRow } from "../_lib/flat-category-tree";

interface CategoryTableProps {
  rows: FlatCategoryRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

export function CategoryTable({ rows, page, totalPages, totalCount, perPage }: CategoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const firstItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalCount);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleToggle = (cat: CategoryRow, value: boolean) => {
    startTransition(async () => {
      const result = await toggleCategoryStatus(cat.id, value);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCategory(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${deleteTarget.name}" dihapus.`);
      }
      setDeleteTarget(null);
    });
  };

  if (totalCount === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <Grid2X2 size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada kategori</p>
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
                  Nama
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                  Slug
                </th>
                <th className="hidden px-4 py-3 text-center text-[10px] font-semibold text-foreground uppercase md:table-cell">
                  Urutan
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-foreground uppercase">
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
                    <div className={row.depth === 1 ? "ml-4 flex items-center gap-2" : ""}>
                      {row.depth === 1 && (
                        <CornerDownRight size={12} className="shrink-0 text-foreground" />
                      )}
                      <div>
                        <p
                          className={`leading-tight font-semibold ${
                            row.depth === 0 ? "text-base" : "text-xs text-foreground"
                          }`}
                        >
                          {row.name}
                        </p>
                        {row.depth === 0 && (
                          <Badge
                            variant="outline"
                            className="mt-0.5 border-brand/30 bg-brand/5 px-1.5 py-0 text-[9px] font-semibold text-brand uppercase"
                          >
                            Induk
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-mono text-[11px] text-foreground">/{row.slug}</span>
                  </td>

                  <td className="hidden px-4 py-3 text-center md:table-cell">
                    <span className="text-xs text-foreground">{row.sort_order}</span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={row.is_active}
                      onCheckedChange={(v) => handleToggle(row, v)}
                      disabled={isPending}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminTableEditLink
                        href={`/admin/categories/${row.id}/edit`}
                        appearance="filled"
                      >
                        Edit
                      </AdminTableEditLink>
                      <AdminTableDeleteButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={isPending}
                      >
                        Hapus
                      </AdminTableDeleteButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground">
            Menampilkan {firstItem}–{lastItem} dari {totalCount} kategori
          </p>
          <div className="flex items-center gap-1">
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
            <span className="flex h-8 items-center border-y border-border px-3 text-xs font-semibold uppercase">
              {page} / {totalPages}
            </span>
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Hapus Kategori?</DialogTitle>
            <DialogDescription>
              Kategori{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus permanen. Pastikan tidak ada produk atau subkategori di dalamnya.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleDelete}

              loading={isPending}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
