"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { uploadProductImage } from "./upload-image";

interface VariantImagePickerProps {
  /** URL foto varian saat ini (kosong = belum ada). */
  value: string;
  hasError?: boolean;
  onChange: (url: string) => void;
}

/**
 * Foto varian HANYA boleh upload baru — tidak boleh pilih dari galeri foto
 * produk, dan hasil uploadnya tidak masuk ke galeri foto produk.
 */
export function VariantImagePicker({ value, hasError, onChange }: VariantImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted/30",
          hasError ? "border-destructive" : "border-[#e0e0e0]",
        )}
      >
        {value ? <Image src={value} alt="" fill sizes="48px" className="object-cover" /> : null}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-dashed border-[#e0e0e0] px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand",
          uploading && "cursor-not-allowed opacity-50",
        )}
      >
        {uploading ? <Spinner className="size-3.5" /> : <ImagePlus size={13} />}
        {value ? "Ganti Foto" : "Upload Foto"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleUpload(e.target.files)}
      />

      <p className="text-[11px] leading-tight text-muted-foreground">
        Khusus varian — upload baru, tidak masuk galeri foto produk.
      </p>
    </div>
  );
}
