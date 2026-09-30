"use client";

import { useState } from "react";
import Image from "next/image";

import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Thumbnail foto ulasan; klik untuk melihat ukuran penuh. */
export function ReviewPhotos({ images, authorName }: { images: string[]; authorName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const current = openIndex !== null ? images[openIndex] : null;
  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + images.length) % images.length));

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`Lihat foto ${i + 1} dari ${authorName}`}
            className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#e0e0e0] bg-white transition-opacity hover:opacity-85"
          >
            <Image
              src={url}
              alt={`Foto ulasan ${i + 1}`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </button>
        ))}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] bg-white p-3 sm:max-w-2xl">
          <DialogTitle className="sr-only">Foto ulasan dari {authorName}</DialogTitle>
          {current && (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f5f5f7]">
              <Image
                src={current}
                alt={`Foto ulasan ${(openIndex ?? 0) + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 672px) 100vw, 672px"
              />
            </div>
          )}
          {images.length > 1 && (
            <div className="flex items-center justify-between">
              <CarouselNavButton
                direction="prev"
                surface="surface"
                className="border border-[#e0e0e0] bg-white"
                aria-label="Foto sebelumnya"
                onClick={() => step(-1)}
              />
              <span className="text-xs text-[#7a7a7a]">
                {(openIndex ?? 0) + 1} / {images.length}
              </span>
              <CarouselNavButton
                direction="next"
                surface="surface"
                className="border border-[#e0e0e0] bg-white"
                aria-label="Foto berikutnya"
                onClick={() => step(1)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
