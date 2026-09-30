"use client";

import { useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import {
  createPromotion,
  updatePromotion,
  createPromotionBannerInline,
  type PromotionType,
  type PromotionFormData,
} from "../_actions";
import {
  ProductBrandSelector,
  type ProductOption,
  type BrandOption,
} from "./product-brand-selector";

const labelClass = "text-[11px] font-semibold uppercase text-foreground";

export type PromotionInitialData = {
  id: string;
  title: string;
  subtitle?: string | null;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  config: Record<string, unknown>;
  product_ids: string[];
  brand_ids: string[];
};

interface PromotionFormProps {
  type: PromotionType;
  backPath: string;
  redirectPath: string;
  initialData?: PromotionInitialData;
  products: ProductOption[];
  brands: BrandOption[];
  categories?: { id: string; name: string }[];
  bannerSection?: ReactNode;
}

const TYPE_LABELS: Record<PromotionType, string> = {
  second_products: "Produk Second Terbaik",
  featured_products: "Rekomendasi Produk",
};

export function PromotionForm({
  type,
  backPath,
  redirectPath,
  initialData,
  products,
  brands,
  categories,
  bannerSection,
}: PromotionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? "");
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [maxItems, setMaxItems] = useState(initialData?.max_items ?? 8);
  const [selectionMode, setSelectionMode] = useState<"manual" | "brand">(
    initialData?.selection_mode ?? "manual",
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialData?.product_ids ?? [],
  );
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(initialData?.brand_ids ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul promosi wajib diisi.");
      return;
    }
    if (selectionMode === "manual" && selectedProductIds.length === 0) {
      toast.error("Pilih minimal 1 produk.");
      return;
    }
    if (selectionMode === "brand" && selectedBrandIds.length === 0) {
      toast.error("Pilih minimal 1 brand.");
      return;
    }

    const data: PromotionFormData = {
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      is_active: isActive,
      max_items: maxItems,
      selection_mode: selectionMode,
      config: initialData?.config ?? getDefaultConfig(type),
      product_ids: selectedProductIds,
      brand_ids: selectedBrandIds,
    };

    startTransition(async () => {
      const uploadBanner = async () => {
        if (!bannerFile) return;
        const fd = new FormData();
        fd.append("image", bannerFile);
        const { error: bannerErr } = await createPromotionBannerInline(type, fd);
        if (bannerErr) toast.error(`Promosi disimpan, tapi gagal upload banner: ${bannerErr}`);
      };

      if (initialData) {
        const { error } = await updatePromotion(initialData.id, data);
        if (error) {
          toast.error(error);
          return;
        }
        await uploadBanner();
        toast.success("Promosi diperbarui.");
        router.push(redirectPath);
      } else {
        const { error, id } = await createPromotion(data);
        if (error || !id) {
          toast.error(error ?? "Gagal membuat promosi.");
          return;
        }
        await uploadBanner();
        toast.success("Promosi berhasil dibuat.");
        router.push(`${redirectPath}/${id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="admin-utility-card space-y-4 p-6">
        <div>
          <h2 className="admin-section-title">Informasi Promosi</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Template: {TYPE_LABELS[type]}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Judul *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Contoh: ${getPlaceholderTitle(type)}`}
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px] leading-[1.47]"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>
              Subtitle{" "}
              <span className="font-normal text-muted-foreground normal-case">(opsional)</span>
            </label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Contoh: Temukan produk terbaik dengan harga spesial"
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px] leading-[1.47]"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Maks. Produk Ditampilkan</label>
            <Input
              type="number"
              value={maxItems}
              onChange={(e) => setMaxItems(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px]"
              min={1}
              max={50}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className={labelClass}>Status</label>
            <StatusPillToggle
              active={isActive}
              onToggle={() => setIsActive((v) => !v)}
              activeLabel="Aktif"
              inactiveLabel="Nonaktif"
              className="w-full justify-center"
            />
          </div>
        </div>
      </div>

      <div className="admin-utility-card space-y-4 p-6">
        <div>
          <h2 className="admin-section-title">Pilihan Produk</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Pilih produk satu per satu atau berdasarkan brand
          </p>
        </div>
        <ProductBrandSelector
          mode={selectionMode}
          onModeChange={setSelectionMode}
          products={
            type === "second_products" ? products.filter((p) => p.condition === "second") : products
          }
          brands={brands}
          categories={categories}
          selectedProductIds={selectedProductIds}
          selectedBrandIds={selectedBrandIds}
          onProductsChange={setSelectedProductIds}
          onBrandsChange={setSelectedBrandIds}
          filterBrandsByProducts={type === "second_products"}
        />

        {/* Selected items detail panel */}
        {selectionMode === "manual" && selectedProductIds.length > 0 && (
          <div className="bg-brand/[0.03][0.06] overflow-hidden rounded-lg border border-brand/30">
            <div className="border-b border-brand/20 px-4 py-2.5">
              <p className="text-[11px] font-semibold text-brand uppercase">
                {selectedProductIds.length} produk dipilih
              </p>
            </div>
            <div className="divide-y divide-brand/10">
              {selectedProductIds.map((pid) => {
                const product = products.find((p) => p.id === pid);
                if (!product) return null;
                return (
                  <div key={pid} className="flex items-center gap-3 px-4 py-2.5">
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
                      <p className="text-xs text-muted-foreground">
                        {product.brand_name ?? "—"} · {formatRupiah(product.price)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectionMode === "brand" && selectedBrandIds.length > 0 && (
          <div className="bg-brand/[0.03][0.06] overflow-hidden rounded-lg border border-brand/30">
            <div className="border-b border-brand/20 px-4 py-2.5">
              <p className="text-[11px] font-semibold text-brand uppercase">
                {selectedBrandIds.length} brand dipilih
              </p>
            </div>
            <div className="divide-y divide-brand/10">
              {selectedBrandIds.map((bid) => {
                const brand = brands.find((b) => b.id === bid);
                if (!brand) return null;
                return (
                  <div key={bid} className="flex items-center gap-3 px-4 py-2.5">
                    <p className="text-sm font-medium text-foreground">{brand.name}</p>
                    <p className="ml-auto text-xs text-muted-foreground">
                      {brand.product_count} produk
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Banner upload — only on create */}
      {!bannerSection && (
        <div className="admin-utility-card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <h2 className="admin-section-title">Banner Promosi</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
              Opsional
            </span>
          </div>

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
            <div className="relative overflow-hidden rounded-lg border border-[#e0e0e0]">
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
              className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#e0e0e0] py-8 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
            >
              <ImagePlus size={22} strokeWidth={1.5} />
              <span className="text-xs font-semibold uppercase">Pilih gambar banner</span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 1 MB</span>
            </button>
          )}
        </div>
      )}

      {bannerSection}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {initialData ? "Perbarui" : "Buat Promosi"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(backPath)}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

function getDefaultConfig(type: PromotionType): Record<string, unknown> {
  if (type === "second_products") return { sort_by: "rating" };
  if (type === "featured_products") return { sort_by: "newest" };
  return {};
}

function getPlaceholderTitle(type: PromotionType): string {
  if (type === "second_products") return "Produk Second Pilihan Kami";
  if (type === "featured_products") return "Rekomendasi untuk Kamu";
  return "Judul Promosi";
}
