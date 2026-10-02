"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { deleteBrand, toggleBrandStatus } from "../_actions";

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

interface BrandTableProps {
  brands: BrandRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

export function BrandTable({ brands, page, totalPages, totalCount, perPage }: BrandTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const firstItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalCount);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleToggle = (brand: BrandRow, value: boolean) => {
    startTransition(async () => {
      const result = await toggleBrandStatus(brand.id, value);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteBrand(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${deleteTarget.name}" dihapus.`);
      }
      setDeleteTarget(null);
    });
  };

  if (brands.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <Building2 size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada merek</p>
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
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map((brand) => (
                <tr key={brand.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {brand.logo_url ? (
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                          <Image
                            src={brand.logo_url}
                            alt={brand.name}
                            fill
                            sizes="28px"
                            className="object-contain p-0.5"
                          />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                          <Building2 size={12} className="text-foreground" />
                        </div>
                      )}
                      <p className="text-base leading-tight font-semibold">{brand.name}</p>
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-mono text-[11px] text-foreground">/{brand.slug}</span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={brand.is_active}
                      onCheckedChange={(v) => handleToggle(brand, v)}
                      disabled={isPending}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminTableEditLink
                        href={`/admin/brands/${brand.id}/edit`}
                        appearance="filled"
                      >
                        Edit
                      </AdminTableEditLink>
                      <AdminTableDeleteButton
                        onClick={() => setDeleteTarget(brand)}
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
            Menampilkan {firstItem}–{lastItem} dari {totalCount} merek
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
            <DialogTitle className="text-lg font-semibold">Hapus Merek?</DialogTitle>
            <DialogDescription>
              Merek{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus permanen. Pastikan tidak ada produk yang menggunakan merek ini.
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
