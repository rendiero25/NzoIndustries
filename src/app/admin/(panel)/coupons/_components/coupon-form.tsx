"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { Textarea } from "@/components/ui/textarea";
import { createCoupon, updateCoupon, type CouponFormData } from "../_actions";

const labelClass = "text-[11px] font-semibold text-foreground";
const inputClass = "h-10 rounded-lg border-[#e0e0e0] text-[17px]";

type InitialData = {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  max_usage: number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  image_url: string | null;
  applies_to: "all" | "product" | "category" | "brand";
  applies_to_ids: string[];
};

type SelectableItem = { id: string; name: string };
type ProductItem = SelectableItem & { category_id: string | null; brand_id: string | null };

type CouponFormProps = {
  initialData?: InitialData;
  products?: ProductItem[];
  categories?: SelectableItem[];
  brands?: SelectableItem[];
};

export function CouponForm({
  initialData,
  products = [],
  categories = [],
  brands = [],
}: CouponFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Info
  const [code, setCode] = useState(initialData?.code ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState<"percentage" | "fixed">(initialData?.type ?? "percentage");
  const [value, setValue] = useState(String(initialData?.value ?? ""));
  const [minPurchase, setMinPurchase] = useState(String(initialData?.min_purchase ?? "0"));
  const [maxDiscount, setMaxDiscount] = useState(String(initialData?.max_discount ?? ""));
  const [maxUsage, setMaxUsage] = useState(String(initialData?.max_usage ?? ""));
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [validFrom, setValidFrom] = useState(
    initialData?.valid_from ? initialData.valid_from.slice(0, 16) : "",
  );
  const [validUntil, setValidUntil] = useState(
    initialData?.valid_until ? initialData.valid_until.slice(0, 16) : "",
  );

  // Berlaku untuk
  const [appliesTo, setAppliesTo] = useState<"all" | "product" | "category" | "brand">(
    initialData?.applies_to ?? "all",
  );
  const [appliesToIds, setAppliesToIds] = useState<string[]>(initialData?.applies_to_ids ?? []);
  const [itemSearch, setItemSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filterBrandId, setFilterBrandId] = useState("all");

  // Image
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("bucket", "coupons");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
      setImageUrl(json.url as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = parseFloat(value);
    const numMinPurchase = parseFloat(minPurchase) || 0;
    const numMaxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
    const numMaxUsage = maxUsage ? parseInt(maxUsage, 10) : null;

    if (!code.trim()) {
      toast.error("Kode kupon wajib diisi.");
      return;
    }
    if (Number.isNaN(numValue) || numValue <= 0) {
      toast.error("Nilai diskon harus lebih dari 0.");
      return;
    }
    if (type === "percentage" && numValue > 100) {
      toast.error("Persentase tidak boleh lebih dari 100%.");
      return;
    }
    if (numMaxDiscount !== null && numMaxDiscount <= 0) {
      toast.error("Maks. diskon harus lebih dari 0.");
      return;
    }
    if (numMaxUsage !== null && numMaxUsage <= 0) {
      toast.error("Maks. pemakaian harus lebih dari 0.");
      return;
    }
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      toast.error("Tanggal berakhir harus setelah tanggal mulai.");
      return;
    }

    const data: CouponFormData = {
      code,
      title: title || null,
      description: description || null,
      type,
      value: numValue,
      min_purchase: numMinPurchase,
      max_discount: numMaxDiscount,
      max_usage: numMaxUsage,
      is_active: isActive,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      image_url: imageUrl || null,
      applies_to: appliesTo,
      applies_to_ids: appliesToIds,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateCoupon(initialData.id, data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Kupon diperbarui.");
      } else {
        const { error } = await createCoupon(data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Kupon berhasil dibuat.");
      }
      router.push("/admin/coupons");
    });
  };

  // Filtered product list
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(itemSearch.toLowerCase());
    const matchCat = filterCategoryId === "all" || p.category_id === filterCategoryId;
    const matchBrand = filterBrandId === "all" || p.brand_id === filterBrandId;
    return matchSearch && matchCat && matchBrand;
  });

  const toggleId = (id: string) =>
    setAppliesToIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Informasi Kupon ──────────────────────────────────────── */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Informasi Kupon</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Kode Kupon *</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DISKON10"
              className={`${inputClass} font-mono uppercase`}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Kode otomatis dikonversi ke huruf kapital.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Judul Kupon</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Diskon Akhir Tahun 10%"
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">
              Nama kupon yang ditampilkan ke pelanggan.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Deskripsi</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Diskon 10% untuk semua produk, berlaku s.d. 31 Desember."
              rows={3}
              className="resize-none rounded-lg border-[#e0e0e0] text-[15px] leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Keterangan singkat syarat dan ketentuan kupon.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Tipe Diskon *</label>
            <SegmentedControl
              value={type}
              onChange={setType}
              fullWidth
              size="compact"
              aria-label="Tipe diskon"
              options={[
                { value: "percentage", label: "Persentase (%)" },
                { value: "fixed", label: "Nominal (Rp)" },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Nilai Diskon *</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                {type === "percentage" ? "%" : "Rp"}
              </span>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "10" : "50000"}
                min={0}
                max={type === "percentage" ? 100 : undefined}
                step={type === "percentage" ? "1" : "1000"}
                className={`${inputClass} pl-9`}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Min. Belanja</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                Rp
              </span>
              <Input
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0"
                min={0}
                step={1000}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>
              Maks. Diskon{type === "percentage" ? "" : " (N/A)"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                Rp
              </span>
              <Input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="Tidak terbatas"
                min={0}
                step={1000}
                disabled={type === "fixed"}
                className={`${inputClass} pl-9 disabled:opacity-40`}
              />
            </div>
            {type === "percentage" && (
              <p className="text-[11px] text-muted-foreground">
                Kosongkan jika tidak ada batas nominal.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Berlaku Untuk ────────────────────────────────────────── */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Berlaku Untuk</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <label className={labelClass}>Tipe Cakupan</label>
            <Select
              value={appliesTo}
              onValueChange={(v) => {
                setAppliesTo(v as typeof appliesTo);
                setAppliesToIds([]);
                setItemSearch("");
                setFilterCategoryId("all");
                setFilterBrandId("all");
              }}
            >
              <SelectTrigger className="h-10 rounded-lg border-[#e0e0e0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Produk</SelectItem>
                <SelectItem value="product">Produk Tertentu</SelectItem>
                <SelectItem value="category">Kategori Tertentu</SelectItem>
                <SelectItem value="brand">Merek Tertentu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appliesTo !== "all" &&
            (() => {
              const isProduct = appliesTo === "product";
              const items = isProduct
                ? filteredProducts
                : appliesTo === "category"
                  ? categories
                  : brands;
              const allItems = isProduct
                ? products
                : appliesTo === "category"
                  ? categories
                  : brands;
              const label = isProduct ? "produk" : appliesTo === "category" ? "kategori" : "merek";
              const filteredGeneric = isProduct
                ? filteredProducts
                : allItems.filter((item) =>
                    item.name.toLowerCase().includes(itemSearch.toLowerCase()),
                  );

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Pilih {label}</label>
                    {appliesToIds.length > 0 && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {appliesToIds.length} dipilih
                      </span>
                    )}
                  </div>

                  {/* Search + filter row */}
                  <div className={`flex gap-2 ${isProduct ? "flex-col sm:flex-row" : ""}`}>
                    <Input
                      placeholder={`Cari ${label}...`}
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="h-9 flex-1 rounded-md border-[#e0e0e0] text-sm"
                    />
                    {isProduct && (
                      <>
                        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                          <SelectTrigger className="h-9 w-full rounded-md border-[#e0e0e0] text-sm sm:w-44">
                            <SelectValue placeholder="Semua Kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={filterBrandId} onValueChange={setFilterBrandId}>
                          <SelectTrigger className="h-9 w-full rounded-md border-[#e0e0e0] text-sm sm:w-40">
                            <SelectValue placeholder="Semua Merek" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Merek</SelectItem>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Item list */}
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-[#e0e0e0]">
                    {filteredGeneric.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        Tidak ada {label} ditemukan.
                      </p>
                    ) : (
                      <ul>
                        {filteredGeneric.map((item, idx) => (
                          <li
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 ${idx !== 0 ? "border-t border-[#e0e0e0]" : ""}`}
                            onClick={() => toggleId(item.id)}
                          >
                            <Checkbox
                              checked={appliesToIds.includes(item.id)}
                              onCheckedChange={() => toggleId(item.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {appliesToIds.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Pilih minimal 1 {label}, atau ganti ke &quot;Semua Produk&quot;.
                    </p>
                  )}
                </div>
              );
            })()}
        </div>
      </div>

      {/* ── Batas & Masa Berlaku ─────────────────────────────────── */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Batas & Masa Berlaku</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Maks. Pemakaian</label>
            <Input
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              placeholder="Tidak terbatas"
              min={1}
              step={1}
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">Kosongkan untuk tidak terbatas.</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Status</label>
            <StatusPillToggle
              active={isActive}
              onToggle={() => setIsActive((v) => !v)}
              activeLabel="Aktif"
              inactiveLabel="Nonaktif"
              className="w-full justify-center"
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Berlaku Mulai</label>
            <Input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">Kosongkan jika langsung berlaku.</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Berlaku Hingga</label>
            <Input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-muted-foreground">
              Kosongkan jika tidak ada batas waktu.
            </p>
          </div>
        </div>
      </div>

      {/* ── Gambar Kupon ─────────────────────────────────────────── */}
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Gambar Kupon</h2>
        </div>
        <div className="space-y-1.5 p-6">
          <label className={labelClass}>Banner / Ilustrasi</label>
          <p className="text-[11px] text-muted-foreground">
            Gambar promosi kupon. Rasio ideal 2:1 (mis. 800×400px). Maks. 5 MB.
          </p>
          <input type="hidden" value={imageUrl} readOnly />

          {imageUrl ? (
            <div
              className="group relative w-full overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted"
              style={{ aspectRatio: "2/1" }}
            >
              <Image
                src={imageUrl}
                alt="Gambar kupon"
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Hapus gambar"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#e0e0e0] py-10 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? <Spinner className="size-5" /> : <ImagePlus size={20} />}
              <span className="text-xs font-semibold">
                {uploading ? "Mengupload..." : "Klik untuk upload gambar"}
              </span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB</span>
            </button>
          )}

          <input
            ref={imageRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleImageUpload(e.target.files)}
          />
          {imageUrl && (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={uploading}
              className="admin-text-link text-[11px]"
            >
              Ganti gambar
            </button>
          )}
        </div>
      </div>

      {/* ── Submit ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {initialData ? "Perbarui Kupon" : "Buat Kupon"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push("/admin/coupons")}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
