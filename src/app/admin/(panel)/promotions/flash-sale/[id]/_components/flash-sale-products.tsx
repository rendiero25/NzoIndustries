"use client";

import { useState, useTransition } from "react";
import { Package, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import { formatRupiah } from "@/lib/format";
import {
  AdminTableDeleteButton,
  AdminTableRowTextButton,
} from "@/components/admin/admin-table-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addFlashSaleProduct,
  updateFlashSaleProduct,
  removeFlashSaleProduct,
} from "../../_actions";

export type FlashSaleProductRow = {
  id: string;
  variant_id: string;
  sale_price: number;
  quota: number;
  sold: number;
  product_variants: {
    name: string;
    sku: string;
    price: number;
    products: { name: string; slug: string } | null;
  } | null;
};

export type VariantOption = {
  id: string;
  name: string;
  sku: string;
  price: number;
  product_name: string;
};

interface FlashSaleProductsProps {
  flashSaleId: string;
  products: FlashSaleProductRow[];
  availableVariants: VariantOption[];
}

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

function EditRow({ product, onDone }: { product: FlashSaleProductRow; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const normalPrice = product.product_variants?.price ?? 0;
  const initialDiscount =
    normalPrice > 0 ? Math.round(((normalPrice - product.sale_price) / normalPrice) * 100) : 0;
  const [discountPercent, setDiscountPercent] = useState(initialDiscount);
  const [quota, setQuota] = useState(product.quota);

  const computedPrice = normalPrice > 0 ? Math.round(normalPrice * (1 - discountPercent / 100)) : 0;

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await updateFlashSaleProduct(product.id, computedPrice, quota);
      if (error) toast.error(error);
      else {
        toast.success("Produk diperbarui.");
        onDone();
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <span className={labelClass}>Diskon:</span>
        <div className="relative">
          <Input
            type="number"
            value={discountPercent}
            onChange={(e) =>
              setDiscountPercent(Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0)))
            }
            className="h-8 w-20 rounded-lg border-border pr-7 text-xs"
            min={0}
            max={99}
          />
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground">
            %
          </span>
        </div>
        {normalPrice > 0 && (
          <span className="text-[11px] font-semibold text-brand">
            → {formatRupiah(computedPrice)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className={labelClass}>Kuota:</span>
        <Input
          type="number"
          value={quota}
          onChange={(e) => setQuota(parseInt(e.target.value, 10) || 0)}
          className="h-8 w-20 rounded-lg border-border text-xs"
          min={1}
        />
      </div>
      <Button
        type="button"
        variant="primary"
        size="icon-sm"
        onClick={handleSave}
        loading={isPending}
        aria-label="Simpan"
      >
        <Save size={13} />
      </Button>
      <Button
        type="button"
        variant="pearl"
        size="icon-sm"
        onClick={onDone}
        disabled={isPending}
        aria-label="Batal"
      >
        <X size={13} />
      </Button>
    </div>
  );
}

function AddProductForm({
  flashSaleId,
  availableVariants,
}: {
  flashSaleId: string;
  availableVariants: VariantOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [quota, setQuota] = useState(10);

  const selectedVariant = availableVariants.find((v) => v.id === variantId);
  const computedPrice = selectedVariant
    ? Math.round(selectedVariant.price * (1 - discountPercent / 100))
    : 0;

  const handleAdd = () => {
    if (!variantId) {
      toast.error("Pilih variant terlebih dahulu.");
      return;
    }
    if (discountPercent <= 0 || discountPercent >= 100) {
      toast.error("Diskon harus antara 1% – 99%.");
      return;
    }
    if (computedPrice <= 0) {
      toast.error("Harga flash sale harus lebih dari 0.");
      return;
    }
    if (quota <= 0) {
      toast.error("Kuota harus lebih dari 0.");
      return;
    }

    startTransition(async () => {
      const { error } = await addFlashSaleProduct({
        flash_sale_id: flashSaleId,
        variant_id: variantId,
        sale_price: computedPrice,
        quota,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Produk ditambahkan ke flash sale.");
      setOpen(false);
      setVariantId("");
      setDiscountPercent(20);
      setQuota(10);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-border px-4 text-xs font-semibold text-muted-foreground uppercase transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Plus size={14} />
        Tambah Produk
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="admin-section-title">Tambah Produk Flash Sale</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelClass}>Pilih Variant *</label>
          <select
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
            }}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <option value="">-- Pilih variant --</option>
            {availableVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.product_name} — {v.name} ({v.sku}) · {formatRupiah(v.price)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>
            Diskon *
            {selectedVariant && (
              <span className="ml-1 font-normal text-muted-foreground/60 normal-case">
                (Normal: {formatRupiah(selectedVariant.price)})
              </span>
            )}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0)))
              }
              className="h-10 rounded-lg border-border pr-9 text-base"
              min={1}
              max={99}
              placeholder="20"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
          {selectedVariant && (
            <p className="text-xs font-semibold text-brand">
              Harga flash sale: {formatRupiah(computedPrice)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Kuota *</label>
          <Input
            type="number"
            value={quota}
            onChange={(e) => setQuota(parseInt(e.target.value, 10) || 0)}
            className="h-10 rounded-lg border-border text-base"
            min={1}
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={handleAdd} loading={isPending}>
          Tambahkan
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}

export function FlashSaleProducts({
  flashSaleId,
  products,
  availableVariants,
}: FlashSaleProductsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = (productId: string) => {
    startTransition(async () => {
      const { error } = await removeFlashSaleProduct(productId, flashSaleId);
      if (error) toast.error(error);
      else {
        toast.success("Produk dihapus dari flash sale.");
        setConfirmDeleteId(null);
      }
    });
  };

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="admin-utility-card-header">
        <h2 className="admin-section-title">Produk Flash Sale ({products.length})</h2>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Package size={28} strokeWidth={1} />
          <p className="text-xs font-semibold uppercase">Belum ada produk</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                  Produk / Variant
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                  Harga Normal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                  Harga Flash
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                  Diskon
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                  Kuota / Terjual
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => {
                const normalPrice = product.product_variants?.price ?? 0;
                const discount =
                  normalPrice > 0
                    ? Math.round(((normalPrice - product.sale_price) / normalPrice) * 100)
                    : 0;

                return (
                  <tr key={product.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">
                        {product.product_variants?.products?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.product_variants?.name} · {product.product_variants?.sku}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatRupiah(normalPrice)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === product.id ? (
                        <EditRow product={product} onDone={() => setEditingId(null)} />
                      ) : (
                        <span className="text-xs font-semibold text-brand">
                          {formatRupiah(product.sale_price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {discount > 0 && (
                        <span className="inline-block rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          -{discount}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-medium">{product.sold}</span>
                        <span className="text-muted-foreground"> / {product.quota}</span>
                      </div>
                      <div className="mt-1 h-1 w-20 overflow-hidden bg-muted">
                        <div
                          className="h-full bg-brand transition-all"
                          style={{
                            width: `${Math.min(100, (product.sold / product.quota) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingId !== product.id && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {confirmDeleteId === product.id ? (
                            <>
                              <span className="text-[10px] font-semibold text-destructive uppercase">
                                Yakin?
                              </span>
                              <Button
                                type="button"
                                variant="destructive"
                                size="xs"
                                onClick={() => handleRemove(product.id)}
                                loading={isPending}
                              >
                                Ya
                              </Button>
                              <Button
                                type="button"
                                variant="table-action"
                                size="xs"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isPending}
                              >
                                Batal
                              </Button>
                            </>
                          ) : (
                            <>
                              <AdminTableRowTextButton
                                tone="brand"
                                onClick={() => setEditingId(product.id)}
                              >
                                Edit
                              </AdminTableRowTextButton>
                              <AdminTableDeleteButton
                                onClick={() => setConfirmDeleteId(product.id)}
                                disabled={isPending}
                              >
                                Hapus
                              </AdminTableDeleteButton>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-border p-4">
        <AddProductForm flashSaleId={flashSaleId} availableVariants={availableVariants} />
      </div>
    </div>
  );
}
