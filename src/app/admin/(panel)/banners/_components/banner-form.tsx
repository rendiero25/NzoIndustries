"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { cn } from "@/lib/utils";
import { createBanner, updateBanner, type BannerFormData } from "../_actions";
import { templateToPromotionAdminPath } from "@/lib/banner-template-utils";

type BannerFormProps = {
  template?: string | null;
  initialData?: {
    id: string;
    title: string | null;
    subtitle: string | null;
    image_url: string;
    link_url: string | null;
    sort_order: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    template?: string | null;
  };
};

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

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

export function BannerForm({ initialData, template: templateProp }: BannerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const template = templateProp ?? initialData?.template ?? null;
  const backHref = templateToPromotionAdminPath(template);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [linkUrl, setLinkUrl] = useState(initialData?.link_url ?? "");
  const [sortOrder, setSortOrder] = useState(initialData?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [startsAt, setStartsAt] = useState(
    initialData?.starts_at ? initialData.starts_at.slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = useState(
    initialData?.ends_at ? initialData.ends_at.slice(0, 16) : "",
  );

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

    const data: BannerFormData = {
      title: title || null,
      subtitle: subtitle || null,
      image_url: imageUrl,
      link_url: linkUrl || null,
      sort_order: sortOrder,
      is_active: isActive,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      template,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateBanner(initialData.id, data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Banner berhasil diperbarui.");
      } else {
        const { error } = await createBanner(data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Banner berhasil dibuat.");
      }
      router.push(backHref);
    });
  };

  const inputFieldClass = "h-10 rounded-lg text-base leading-[1.47]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Gambar Banner *">
        <div className="space-y-3 p-5">
          {imageUrl ? (
            <div className="relative aspect-[3/1] max-h-48 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
              <Image src={imageUrl} alt="Preview banner" fill className="object-cover" />
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
                "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-12 text-muted-foreground transition-colors",
                "hover:border-brand/50 hover:text-brand",
                uploading && "cursor-not-allowed opacity-50",
              )}
            >
              {uploading ? <Spinner className="size-6 text-brand" /> : <ImagePlus size={24} />}
              <span className="text-xs font-semibold uppercase">
                {uploading ? "Mengupload..." : "Upload gambar banner"}
              </span>
              <span className="text-center text-[12px] leading-snug text-muted-foreground">
                JPG, PNG, WebP — maks. 5 MB · Rasio 3:1 direkomendasikan
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

      <FormSection title="Konten">
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {!template && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="banner-title" className={labelClass}>
                  Judul
                </label>
                <Input
                  id="banner-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Promo Akhir Tahun"
                  className={inputFieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="banner-subtitle" className={labelClass}>
                  Subtitle
                </label>
                <Input
                  id="banner-subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Diskon hingga 50%"
                  className={inputFieldClass}
                />
              </div>
            </>
          )}
          <div className={cn("space-y-1.5", !template && "sm:col-span-2")}>
            <label htmlFor="banner-link" className={labelClass}>
              URL Link (opsional)
            </label>
            <Input
              id="banner-link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products?category=laptop"
              className={inputFieldClass}
            />
          </div>
        </div>
      </FormSection>

      {!template && (
        <FormSection title="Pengaturan">
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="banner-sort" className={labelClass}>
                Urutan Tampil
              </label>
              <Input
                id="banner-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                min={0}
                className={inputFieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="banner-start" className={labelClass}>
                Mulai Tayang
              </label>
              <Input
                id="banner-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputFieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="banner-end" className={labelClass}>
                Berakhir
              </label>
              <Input
                id="banner-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputFieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <span className={labelClass}>Status</span>
              <StatusPillToggle
                active={isActive}
                onToggle={() => setIsActive((v) => !v)}
                activeLabel="Aktif"
                inactiveLabel="Nonaktif"
                className="w-full justify-center"
              />
            </div>
          </div>
        </FormSection>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" loading={isPending} disabled={uploading}>
          {initialData ? "Perbarui Banner" : "Buat Banner"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(backHref)}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
