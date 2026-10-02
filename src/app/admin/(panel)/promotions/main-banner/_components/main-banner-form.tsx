"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, ClipboardCopy, ImagePlus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { cn } from "@/lib/utils";
import { addBanner } from "../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-foreground";

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="admin-utility-card overflow-hidden">
      <div className="admin-utility-card-header">
        <h2 className="admin-section-title text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const LINK_GUIDE = [
  {
    group: "Produk",
    items: [
      {
        label: "Produk Satuan",
        pattern: "/products/[slug-produk]",
        example: "/products/samsung-galaxy-s24",
        desc: "Mengarah langsung ke halaman detail produk",
      },
      {
        label: "Semua Produk",
        pattern: "/products",
        example: "/products",
        desc: "Halaman daftar semua produk",
      },
      {
        label: "Produk + Filter Harga",
        pattern: "/products?sort=price_asc",
        example: "/products?sort=price_asc",
        desc: "Produk diurutkan harga terendah",
      },
    ],
  },
  {
    group: "Merek & Kategori",
    items: [
      {
        label: "Halaman Merek",
        pattern: "/brands/[slug-merek]",
        example: "/brands/samsung",
        desc: "Tampilkan semua produk dari satu merek",
      },
      {
        label: "Kategori Produk",
        pattern: "/category/[slug-kategori]",
        example: "/category/laptop",
        desc: "Tampilkan semua produk dalam kategori",
      },
    ],
  },
  {
    group: "Template Promosi",
    items: [
      {
        label: "Flash Sale",
        pattern: "/flash-sale",
        example: "/flash-sale",
        desc: "Halaman khusus flash sale (aktif saat ada flash sale berjalan)",
      },
      {
        label: "Produk Second",
        pattern: "/products?promo=second",
        example: "/products?promo=second",
        desc: "Daftar produk second/bekas",
      },
      {
        label: "Rekomendasi",
        pattern: "/products?promo=featured",
        example: "/products?promo=featured",
        desc: "Produk rekomendasi pilihan admin",
      },
    ],
  },
  {
    group: "Pencarian & Lainnya",
    items: [
      {
        label: "Hasil Pencarian",
        pattern: "/search?q=[kata-kunci]",
        example: "/search?q=headphone",
        desc: "Halaman search dengan kata kunci preset",
      },
      {
        label: "Link Eksternal",
        pattern: "https://...",
        example: "https://wa.me/6281234567890",
        desc: "Arahkan ke URL luar (buka tab baru di frontend)",
      },
    ],
  },
];

export function MainBannerForm() {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setTitle("");
    setImageUrl("");
    setLinkUrl("");
    setSortOrder(0);
    setIsActive(true);
    setShowGuide(false);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "banners");

    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
      setImageUrl(json.url as string);
      toast.success("Gambar berhasil diupload.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error("Gambar banner wajib diisi.");
      return;
    }

    startTransition(async () => {
      const { error } = await addBanner({
        title: title || null,
        image_url: imageUrl,
        link_url: linkUrl || null,
        is_active: isActive,
        sort_order: sortOrder,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Banner berhasil ditambahkan.");
      resetForm();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title + Sort Order */}
      <FormSection title="Informasi Banner">
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label htmlFor="mb-title" className={labelClass}>
              Judul <span className="text-muted-foreground/60">(Opsional)</span>
            </label>
            <Input
              id="mb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Flash Sale Akhir Tahun"
              className="h-10 rounded-lg text-base leading-[1.47]"
            />
            <p className="text-[11px] text-muted-foreground">
              Digunakan sebagai label pengenal di daftar banner admin.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mb-sort" className={labelClass}>
              Urutan Tampil
            </label>
            <Input
              id="mb-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="h-10 w-32 rounded-lg text-base leading-[1.47]"
            />
            <p className="text-[11px] text-muted-foreground">
              Angka lebih kecil tampil lebih dulu. Default 0.
            </p>
          </div>
        </div>
      </FormSection>

      {/* Image Upload */}
      <FormSection title="Gambar Banner *">
        <div className="space-y-3 p-5">
          {imageUrl ? (
            <div className="relative aspect-[3/1] max-h-52 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
              <Image src={imageUrl} alt="Preview main banner" fill className="object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2"
                aria-label="Hapus gambar"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-14 text-muted-foreground transition-colors",
                "hover:border-brand/50 hover:text-brand",
                uploading && "cursor-not-allowed opacity-50",
              )}
            >
              {uploading ? <Spinner className="size-6 text-brand" /> : <ImagePlus size={24} />}
              <span className="text-xs font-semibold uppercase">
                {uploading ? "Mengupload..." : "Upload gambar hero banner"}
              </span>
              <span className="text-center text-[12px] leading-snug text-muted-foreground">
                JPG, PNG, WebP · Maks. 5 MB · Rasio 3:1 direkomendasikan (contoh: 1440×480 px)
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </FormSection>

      {/* Link URL + Guide */}
      <FormSection title="Link Banner">
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label htmlFor="mb-link" className={labelClass}>
              URL Tujuan
            </label>
            <Input
              id="mb-link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products/samsung-galaxy-s24 atau /category/laptop"
              className="h-10 rounded-lg text-base leading-[1.47]"
            />
            <p className="text-[11px] text-muted-foreground">
              Gunakan path relatif untuk halaman internal, atau URL lengkap untuk link eksternal.
            </p>
          </div>

          {/* Collapsible link guide */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Panduan Format Link
              </span>
              <ChevronDown
                size={13}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200",
                  showGuide && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                showGuide ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="border-t border-border px-4 pt-3 pb-4">
                <p className="mb-3 text-[12px] text-muted-foreground">
                  Klik baris mana saja untuk langsung mengisi kolom URL di atas.
                </p>
                <div className="space-y-4">
                  {LINK_GUIDE.map((group) => (
                    <div key={group.group}>
                      <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                        {group.group}
                      </p>
                      <div className="overflow-hidden rounded-lg border border-border">
                        {group.items.map((item, i) => (
                          <button
                            key={item.example}
                            type="button"
                            onClick={() => {
                              setLinkUrl(item.example);
                              toast.success(`Link diisi: ${item.example}`);
                            }}
                            className={cn(
                              "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted",
                              i !== 0 && "border-t border-border",
                            )}
                          >
                            <ClipboardCopy
                              size={12}
                              className="mt-0.5 shrink-0 text-muted-foreground"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-[12px] font-semibold text-foreground">
                                  {item.label}
                                </span>
                                <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-brand">
                                  {item.example}
                                </code>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {item.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Tips: Slug Produk & Kategori
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Temukan slug produk di halaman edit produk · Temukan slug kategori/merek di
                    halaman edit kategori atau merek masing-masing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Status */}
      <FormSection title="Status">
        <div className="p-5">
          <StatusPillToggle
            active={isActive}
            onToggle={() => setIsActive((v) => !v)}
            activeLabel="Aktif"
            inactiveLabel="Nonaktif"
            className="w-full justify-center sm:w-48"
          />
        </div>
      </FormSection>

      {/* Submit */}
      <Button type="submit" variant="primary" loading={isPending} disabled={uploading}>
        Tambah Banner
      </Button>
    </form>
  );
}
