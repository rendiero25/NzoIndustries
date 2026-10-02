"use client";

import { ImageOff } from "lucide-react";
import { CldImage } from "next-cloudinary";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  publicId: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * Foto produk dari Cloudinary (f_auto, q_auto, 1:1, design-system.md §11).
 * Tanpa public_id atau cloud name: placeholder netral, bukan gambar rusak.
 */
export function ProductImage({ publicId, alt, sizes, priority, className }: ProductImageProps) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const valid = !!publicId && publicId.startsWith("nzo/") && !!cloudName;

  if (!valid) {
    return (
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center gap-1.5 bg-steel-50 text-steel-500",
          className,
        )}
        role="img"
        aria-label={`${alt} (foto belum tersedia)`}
      >
        <ImageOff className="size-6" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-caption">Foto segera</span>
      </div>
    );
  }

  return (
    <CldImage
      src={publicId}
      alt={alt}
      fill
      sizes={sizes}
      crop="fill"
      gravity="auto"
      format="auto"
      quality="auto"
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
