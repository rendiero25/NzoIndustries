"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminTableDeleteButton,
  AdminTableDetailLink,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import {
  deleteProduct,
  toggleProductStatus,
  bulkDeleteProducts,
  bulkSetBrand,
  bulkSetStatus,
  bulkSetCondition,
} from "../_actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductVariant = {
  id: string;
  stock: number;
  reserved: number;
  is_active: boolean;
};

type ProductImage = {
  url: string;
  is_primary: boolean;
};

type ProductCategory = {
  id: string;
  name: string;
} | null;

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  condition: "new" | "second";
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  categories: ProductCategory;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

type Brand = { id: string; name: string };

interface ProductTableProps {
  products: ProductRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  brands?: Brand[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTotalStock(variants: ProductVariant[]) {
  return variants
    .filter((v) => v.is_active)
    .reduce((sum, v) => sum + Math.max(0, v.stock - v.reserved), 0);
}

function getPrimaryImage(images: ProductImage[]) {
  return images.find((img) => img.is_primary)?.url ?? images[0]?.url ?? null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductTable({
  products,
  page,
  totalPages,
  totalCount,
  perPage,
  brands = [],
}: ProductTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allPageIds = products.map((p) => p.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id));

  // Bulk action dialogs
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<"new" | "second">("new");

  const firstItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalCount);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => new Set([...prev, ...allPageIds]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleToggle = (product: ProductRow, value: boolean) => {
    startTransition(async () => {
      const result = await toggleProductStatus(product.id, value);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProduct(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${deleteTarget.name}" dihapus.`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
      }
      setDeleteTarget(null);
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkDeleteProducts(ids);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${ids.length} produk dihapus.`);
        clearSelection();
      }
      setBulkDeleteOpen(false);
    });
  };

  const handleBulkSetBrand = () => {
    const ids = Array.from(selectedIds);
    const brandId = selectedBrandId === "__none__" ? null : selectedBrandId || null;
    startTransition(async () => {
      const result = await bulkSetBrand(ids, brandId);
      if (result.error) {
        toast.error(result.error);
      } else {
        const brandName = brands.find((b) => b.id === brandId)?.name ?? "—";
        toast.success(`Merek ${ids.length} produk diubah ke "${brandName}".`);
        clearSelection();
      }
      setBrandDialogOpen(false);
      setSelectedBrandId("");
    });
  };

  const handleBulkSetCondition = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkSetCondition(ids, selectedCondition);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Kondisi ${ids.length} produk diubah ke "${selectedCondition === "new" ? "Baru" : "Second"}".`,
        );
        clearSelection();
      }
      setConditionDialogOpen(false);
    });
  };

  const handleBulkStatus = (isActive: boolean) => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkSetStatus(ids, isActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${ids.length} produk ${isActive ? "diaktifkan" : "dinonaktifkan"}.`);
        clearSelection();
      }
    });
  };

  if (products.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <Package size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada produk</p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5">
          <span className="text-xs font-semibold text-brand uppercase">
            {selectedIds.size} dipilih
          </span>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            variant="table-action"
            size="xs"
            onClick={() => handleBulkStatus(true)}
            disabled={isPending}
          >
            Aktifkan
          </Button>
          <Button
            variant="table-action"
            size="xs"
            onClick={() => handleBulkStatus(false)}
            disabled={isPending}
          >
            Nonaktifkan
          </Button>
          {brands.length > 0 && (
            <Button
              variant="table-action"
              size="xs"
              onClick={() => setBrandDialogOpen(true)}
              disabled={isPending}
            >
              Ganti Merek
            </Button>
          )}
          <Button
            variant="table-action"
            size="xs"
            onClick={() => setConditionDialogOpen(true)}
            disabled={isPending}
          >
            Ganti Kondisi
          </Button>
          <Button
            variant="destructive"
            size="xs"
            className="ml-auto"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={isPending}
          >
            Hapus
          </Button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-[10px] font-medium text-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Batal pilih
          </button>
        </div>
      )}

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                    onCheckedChange={(v) => toggleSelectAll(!!v)}
                    className="rounded-md"
                    aria-label="Pilih semua"
                  />
                </th>
                <th className="w-16 px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Foto
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Produk
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                  Kategori
                </th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                  Harga
                </th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold text-foreground uppercase lg:table-cell">
                  Stok
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {products.map((product) => {
                const primaryImage = getPrimaryImage(product.product_images);
                const totalStock = getTotalStock(product.product_variants);
                const isSelected = selectedIds.has(product.id);

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-muted/30 ${isSelected ? "bg-muted/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(v) => toggleSelect(product.id, !!v)}
                        className="rounded-md"
                        aria-label={`Pilih ${product.name}`}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#e0e0e0] bg-muted">
                        {primaryImage ? (
                          <Image
                            src={primaryImage}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package size={16} className="text-foreground" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Name + slug */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="line-clamp-2 text-sm leading-tight font-semibold">
                          {product.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-foreground">
                          /{product.slug}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={`rounded-md px-1.5 py-0 text-[9px] font-semibold uppercase ${
                              product.condition === "second"
                                ? "border-border text-foreground"
                                : "border-brand/40 text-brand"
                            }`}
                          >
                            {product.condition === "second" ? "Second" : "Baru"}
                          </Badge>
                          {product.is_featured ? (
                            <Badge
                              variant="outline"
                              className="rounded-md border-brand/50 px-1.5 py-0 text-[9px] font-semibold text-brand uppercase"
                            >
                              Unggulan
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-foreground">
                        {product.categories?.name ?? "—"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="hidden px-4 py-3 text-right sm:table-cell">
                      {product.sale_price != null ? (
                        <div>
                          <p className="text-xs font-semibold text-brand">
                            {formatRupiah(product.sale_price)}
                          </p>
                          <p className="text-[11px] text-foreground line-through">
                            {formatRupiah(product.base_price)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold">{formatRupiah(product.base_price)}</p>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <span
                        className={
                          totalStock <= 5
                            ? "text-xs font-semibold text-brand"
                            : "text-xs font-medium text-foreground"
                        }
                      >
                        {totalStock} pcs
                      </span>
                    </td>

                    {/* Toggle */}
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={(v) => handleToggle(product, v)}
                        disabled={isPending}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AdminTableDetailLink
                          href={`/products/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Lihat
                        </AdminTableDetailLink>
                        <AdminTableEditLink
                          href={`/admin/products/${product.id}/edit`}
                          appearance="filled"
                        >
                          Edit
                        </AdminTableEditLink>
                        <AdminTableDeleteButton
                          onClick={() => setDeleteTarget(product)}
                          disabled={isPending}
                        >
                          Hapus
                        </AdminTableDeleteButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground">
            Menampilkan {firstItem}-{lastItem} dari {totalCount} produk
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
            <span className="flex h-8 items-center border-y border-[#e0e0e0] px-3 text-xs font-semibold uppercase">
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

      {/* Single delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase">Hapus Produk?</DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Produk{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
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

      {/* Bulk delete confirm dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase">
              Hapus {selectedIds.size} Produk?
            </DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Semua produk yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleBulkDelete}

              loading={isPending}
            >
              {`Hapus ${selectedIds.size} Produk`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk condition selector dialog */}
      <Dialog
        open={conditionDialogOpen}
        onOpenChange={(open) => {
          if (!open) setConditionDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase">Ganti Kondisi</DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Pilih kondisi baru untuk {selectedIds.size} produk yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="flex gap-3">
              {(["new", "second"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSelectedCondition(val)}
                  className={`h-9 flex-1 rounded-md border text-xs font-semibold uppercase transition-colors ${
                    selectedCondition === val
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-[#e0e0e0] bg-transparent text-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {val === "new" ? "Baru" : "Second"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setConditionDialogOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleBulkSetCondition}

                loading={isPending}
              >
                Terapkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk brand selector dialog */}
      <Dialog
        open={brandDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBrandDialogOpen(false);
            setSelectedBrandId("");
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase">Ganti Merek</DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Pilih merek baru untuk {selectedIds.size} produk yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Pilih merek..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Tanpa merek</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setBrandDialogOpen(false);
                  setSelectedBrandId("");
                }}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleBulkSetBrand}
                disabled={isPending || !selectedBrandId}
              >
                Terapkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
