"use client";

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { cn } from "@/lib/utils";
import {
  createFlashSale,
  updateFlashSale,
  bulkAddFlashSaleProducts,
  createFlashSaleBannerInline,
  type FlashSaleFormData,
} from "../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-foreground";

const selectClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand";

export type Product = {
  id: string;
  name: string;
  condition: string | null;
  brand_id: string | null;
  brand_name: string | null;
  category_id: string | null;
  category_name: string | null;
  variants: { id: string; name: string; price: number }[];
};

type FlashSaleFormProps = {
  initialData?: {
    id: string;
    name: string;
    subtitle?: string | null;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  };
  redirectTo?: string;
  products?: Product[];
  categories?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  bannerSection?: ReactNode;
};

export function FlashSaleForm({
  initialData,
  redirectTo,
  products,
  categories = [],
  brands = [],
  bannerSection,
}: FlashSaleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? "");
  const [startsAt, setStartsAt] = useState(
    initialData?.starts_at ? initialData.starts_at.slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = useState(
    initialData?.ends_at ? initialData.ends_at.slice(0, 16) : "",
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [variantDiscounts, setVariantDiscounts] = useState<Record<string, string>>({});
  const [globalDiscount, setGlobalDiscount] = useState("");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = !filterCategory || p.category_id === filterCategory;
      const matchBrand = !filterBrand || p.brand_id === filterBrand;
      return matchSearch && matchCategory && matchBrand;
    });
  }, [products, searchQuery, filterCategory, filterBrand]);

  const variantIdsOfProducts = (productIds: string[]) =>
    (products ?? [])
      .filter((p) => productIds.includes(p.id))
      .flatMap((p) => p.variants.map((v) => v.id));

  const toggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds((prev) => prev.filter((x) => x !== id));
      const vids = variantIdsOfProducts([id]);
      setVariantDiscounts((prev) => {
        const n = { ...prev };
        vids.forEach((vid) => delete n[vid]);
        return n;
      });
    } else {
      setSelectedProductIds((prev) => [...prev, id]);
    }
  };

  const toggleAll = () => {
    const allIds = filteredProducts.map((p) => p.id);
    const allSelected = allIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !allIds.includes(id)));
      const vids = variantIdsOfProducts(allIds);
      setVariantDiscounts((prev) => {
        const n = { ...prev };
        vids.forEach((vid) => delete n[vid]);
        return n;
      });
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const applyGlobalDiscount = () => {
    if (!globalDiscount) return;
    const vids = variantIdsOfProducts(selectedProductIds);
    setVariantDiscounts((prev) => {
      const n = { ...prev };
      vids.forEach((vid) => {
        n[vid] = globalDiscount;
      });
      return n;
    });
  };

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nama flash sale wajib diisi.");
      return;
    }
    if (!startsAt) {
      toast.error("Waktu mulai wajib diisi.");
      return;
    }
    if (!endsAt) {
      toast.error("Waktu berakhir wajib diisi.");
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error("Waktu berakhir harus setelah waktu mulai.");
      return;
    }

    const data: FlashSaleFormData = {
      name: name.trim(),
      subtitle: subtitle.trim() || undefined,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      is_active: isActive,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateFlashSale(initialData.id, data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Flash sale diperbarui.");
        router.push(redirectTo ?? `/admin/promotions/flash-sale/${initialData.id}`);
      } else {
        const { error, id } = await createFlashSale(data);
        if (error || !id) {
          toast.error(error ?? "Gagal membuat flash sale.");
          return;
        }

        if (selectedProductIds.length > 0 && products) {
          const entries = selectedProductIds.flatMap((pid) => {
            const product = products.find((p) => p.id === pid);
            return (product?.variants ?? []).map((v) => {
              const pct = Math.min(99, Math.max(0, parseFloat(variantDiscounts[v.id] ?? "0") || 0));
              return {
                variant_id: v.id,
                sale_price: Math.max(1, Math.round(v.price * (1 - pct / 100))),
              };
            });
          });
          if (entries.length > 0) {
            const { error: bulkErr } = await bulkAddFlashSaleProducts(id, entries);
            if (bulkErr) toast.error(`Flash sale dibuat, tapi gagal tambah produk: ${bulkErr}`);
          }
        }

        if (bannerFile) {
          const fd = new FormData();
          fd.append("image", bannerFile);
          const { error: bannerErr } = await createFlashSaleBannerInline(id, fd);
          if (bannerErr) toast.error(`Flash sale dibuat, tapi gagal upload banner: ${bannerErr}`);
        }

        toast.success("Flash sale berhasil dibuat.");
        router.push(redirectTo ?? `/admin/promotions/flash-sale/${id}`);
      }
    });
  };

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedProductIds.includes(p.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Info flash sale ── */}
      <div className="space-y-4">
        <h2 className="admin-section-title">Informasi Flash Sale</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Nama Flash Sale *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flash Sale 12.12"
              className="h-10 rounded-lg border-border text-base leading-[1.47]"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Subtitle</label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Penawaran terbaik hari ini — stok terbatas!"
              className="h-10 rounded-lg border-border text-[15px] leading-[1.47]"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Mulai *</label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-10 rounded-lg border-border text-base"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Berakhir *</label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-10 rounded-lg border-border text-base"
              required
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <label className={labelClass}>Status</label>
            <StatusPillToggle
              active={isActive}
              onToggle={() => setIsActive((v) => !v)}
              activeLabel="Aktif"
              inactiveLabel="Nonaktif"
              className="max-w-xs justify-center"
            />
          </div>
        </div>
      </div>

      {/* ── Product selector (only for create, when products provided) ── */}
      {!initialData && products && products.length > 0 && (
        <div className="space-y-3 border-t border-border pt-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="admin-section-title">Pilih Produk</h2>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk..."
                className="h-9 rounded-md pl-8 text-sm"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={selectClass}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className={selectClass}
            >
              <option value="">Semua Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product list */}
          <div className="overflow-hidden rounded-lg border border-border">
            {/* Header row */}
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded accent-brand"
              />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                {filteredProducts.length} produk ditemukan
              </span>
              {selectedProductIds.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-brand uppercase">
                  {selectedProductIds.length} dipilih
                </span>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Tidak ada produk yang sesuai filter.
              </p>
            ) : (
              <div className="max-h-64 divide-y divide-border overflow-y-auto">
                {filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4 shrink-0 rounded accent-brand"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {product.name}
                        </p>
                        {product.condition === "second" && (
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 uppercase">
                            second
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {[product.brand_name, product.category_name].filter(Boolean).join(" · ")}
                        {product.variants.length > 0 && <> · {product.variants.length} varian</>}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ── Discount config panel ── */}
          {selectedProductIds.length > 0 && (
            <div className="bg-brand/[0.03][0.06] overflow-hidden rounded-lg border border-brand/30">
              {/* Header + global apply */}
              <div className="flex flex-col gap-3 border-b border-brand/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-brand uppercase">
                    Konfigurasi Diskon
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Berlaku untuk semua varian tiap produk. Bisa diubah di halaman detail.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Terapkan ke semua
                  </span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-border bg-background">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), applyGlobalDiscount())
                      }
                      placeholder="0"
                      className="w-12 bg-transparent px-2 py-1.5 text-center text-sm text-foreground focus:outline-none"
                    />
                    <span className="border-l border-border px-2 py-1.5 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                  <Button type="button" variant="primary" size="xs" onClick={applyGlobalDiscount}>
                    Terapkan
                  </Button>
                </div>
              </div>

              {/* Per-product + per-variant rows */}
              <div className="divide-y divide-brand/10">
                {selectedProductIds.map((pid) => {
                  const product = products?.find((p) => p.id === pid);
                  if (!product || product.variants.length === 0) return null;

                  return (
                    <div key={pid}>
                      {/* Product header */}
                      <div className="bg-muted/30 px-4 py-2">
                        <p className="truncate text-[11px] font-semibold text-foreground uppercase">
                          {product.name}
                        </p>
                      </div>

                      {/* Variant rows — each with its own % input */}
                      <div className="divide-y divide-brand/5">
                        {product.variants.map((v) => {
                          const pct = Math.min(
                            99,
                            Math.max(0, parseFloat(variantDiscounts[v.id] ?? "0") || 0),
                          );
                          const salePrice = Math.max(1, Math.round(v.price * (1 - pct / 100)));
                          return (
                            <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 pl-6">
                              <p className="min-w-0 flex-1 truncate text-xs text-foreground">
                                {v.name}
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                {pct > 0 && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {fmtPrice(v.price)}
                                  </p>
                                )}
                                <p
                                  className={
                                    pct > 0
                                      ? "text-xs font-semibold text-emerald-700"
                                      : "text-xs text-muted-foreground"
                                  }
                                >
                                  {pct > 0 ? fmtPrice(salePrice) : fmtPrice(v.price)}
                                </p>
                                <div className="flex items-center overflow-hidden rounded-md border border-border bg-background">
                                  <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    value={variantDiscounts[v.id] ?? ""}
                                    onChange={(e) =>
                                      setVariantDiscounts((prev) => ({
                                        ...prev,
                                        [v.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    className="w-10 bg-transparent px-1.5 py-1 text-center text-xs text-foreground focus:outline-none"
                                  />
                                  <span className="border-l border-border px-1.5 py-1 text-[10px] text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Banner section ── */}
      {bannerSection ?? (
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-center gap-2">
            <h2 className="admin-section-title">Banner Flash Sale</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
              Opsional
            </span>
          </div>

          {/* Hidden file input */}
          <input
            ref={bannerFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
              setBannerFile(file);
              setBannerPreviewUrl(URL.createObjectURL(file));
              e.target.value = "";
            }}
          />

          {bannerPreviewUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerPreviewUrl}
                alt="Preview banner"
                className="max-h-48 w-full object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  className="h-7 rounded-md bg-white/90 px-3 text-[10px] font-semibold text-foreground uppercase shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
                    setBannerFile(null);
                    setBannerPreviewUrl(null);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bannerFileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
            >
              <ImagePlus size={22} strokeWidth={1.5} />
              <span className="text-xs font-semibold uppercase">Pilih gambar banner</span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 1 MB</span>
            </button>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {initialData ? "Perbarui" : "Buat Flash Sale"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push("/admin/promotions/flash-sale")}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
