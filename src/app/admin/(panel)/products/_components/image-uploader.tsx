"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { uploadProductImage } from "./upload-image";

export type ImageItem = {
  url: string;
  is_primary: boolean;
  alt_text: string;
};

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploads = await Promise.all(Array.from(files).map((f) => uploadProductImage(f)));

      const newImages: ImageItem[] = uploads.map((url, i) => ({
        url,
        is_primary: images.length === 0 && i === 0,
        alt_text: "",
      }));

      onChange([...images, ...newImages]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const setPrimary = (index: number) => {
    onChange(images.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const remove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((img) => img.is_primary)) {
      next[0].is_primary = true;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-8 text-muted-foreground transition-colors",
          "hover:border-brand/40 hover:text-foreground",
          uploading && "cursor-not-allowed opacity-50",
        )}
      >
        {uploading ? <Spinner className="size-6" /> : <ImagePlus size={24} />}
        <span className="text-xs font-semibold uppercase">
          {uploading ? "Mengupload..." : "Klik atau drag foto produk"}
        </span>
        <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {images.map((img, i) => (
            <div
              key={img.url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
            >
              <Image
                src={img.url}
                alt={img.alt_text || "Gambar produk"}
                fill
                sizes="120px"
                className="object-cover"
              />

              {img.is_primary ? (
                <div className="absolute top-1 left-1 bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white uppercase">
                  Utama
                </div>
              ) : null}

              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.is_primary ? (
                  <button
                    type="button"
                    onClick={() => setPrimary(i)}
                    title="Jadikan foto utama"
                    className="rounded-md bg-card p-1.5 text-foreground transition-colors hover:bg-brand/15 hover:text-brand"
                  >
                    <Star size={12} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="Hapus foto"
                  className="rounded-md bg-card p-1.5 text-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
