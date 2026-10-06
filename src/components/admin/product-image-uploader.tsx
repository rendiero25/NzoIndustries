"use client";

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { CldImage, CldUploadWidget, type CloudinaryUploadWidgetInfo } from "next-cloudinary";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  attachProductImage,
  deleteProductImage,
  reorderProductImages,
} from "@/server/actions/product-images";

export type UploaderImage = { id: string; public_id: string; alt_text: string | null };

type Props = {
  productId: string;
  sku: string;
  productName: string;
  initialImages: UploaderImage[];
  /** API key Cloudinary bukan secret; secret tetap di server (signature endpoint). */
  cloudName: string;
  apiKey: string;
};

const MAX_IMAGES = 12;

/**
 * Upload foto produk ke `nzo/products/{sku}` lewat widget Cloudinary bertanda
 * tangan server (/api/cloudinary/sign), lalu disambungkan ke produk.
 */
export function ProductImageUploader({
  productId,
  sku,
  productName,
  initialImages,
  cloudName,
  apiKey,
}: Props) {
  const [images, setImages] = useState(initialImages);
  const [pendingDelete, setPendingDelete] = useState<UploaderImage | null>(null);
  const [isPending, startTransition] = useTransition();

  const folder = `nzo/products/${sku}`;

  const handleUploaded = (info: CloudinaryUploadWidgetInfo | string | undefined) => {
    if (!info || typeof info === "string") return;
    startTransition(async () => {
      const result = await attachProductImage({
        productId,
        publicId: info.public_id,
        altText: productName.slice(0, 150),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setImages((prev) => [
        ...prev,
        { id: result.data.id, public_id: info.public_id, alt_text: productName },
      ]);
      toast.success("Foto ditambahkan.");
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    const previous = images;
    setImages(next);
    startTransition(async () => {
      const result = await reorderProductImages({ productId, orderedIds: next.map((i) => i.id) });
      if (!result.ok) {
        setImages(previous);
        toast.error(result.error);
      }
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const image = pendingDelete;
    startTransition(async () => {
      const result = await deleteProductImage({ imageId: image.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setImages((prev) => prev.filter((i) => i.id !== image.id));
      setPendingDelete(null);
      toast.success("Foto dihapus.");
    });
  };

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Foto produk">
        {images.map((image, index) => (
          <li
            key={image.id}
            className="group relative overflow-hidden rounded-lg border border-border bg-muted"
          >
            <CldImage
              src={image.public_id}
              alt={image.alt_text ?? productName}
              width={300}
              height={300}
              crop="fill"
              className="aspect-square w-full object-cover"
              config={{ cloud: { cloudName } }}
            />
            {index === 0 ? (
              <span className="absolute top-2 left-2 rounded-sm bg-foreground px-1.5 py-0.5 text-xs font-medium text-background">
                Utama
              </span>
            ) : null}
            <div className="flex items-center justify-between gap-1 border-t border-border bg-background p-1">
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Geser ke kiri"
                  disabled={index === 0 || isPending}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="-rotate-90" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Geser ke kanan"
                  disabled={index === images.length - 1 || isPending}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="-rotate-90" />
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive-ghost"
                size="icon-sm"
                aria-label="Hapus foto"
                disabled={isPending}
                onClick={() => setPendingDelete(image)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <CldUploadWidget
        signatureEndpoint={`/api/cloudinary/sign?section=products&sku=${encodeURIComponent(sku)}`}
        config={{ cloud: { cloudName, apiKey } }}
        options={{
          folder,
          sources: ["local", "camera"],
          multiple: true,
          maxFiles: Math.max(1, MAX_IMAGES - images.length),
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          maxFileSize: 5 * 1024 * 1024,
          language: "id",
        }}
        onSuccess={(result) => handleUploaded(result.info)}
        onError={() => toast.error("Upload gagal. Coba lagi.")}
      >
        {({ open }) => (
          <Button
            type="button"
            variant="secondary"
            onClick={() => open()}
            disabled={images.length >= MAX_IMAGES || isPending}
          >
            <ImagePlus />
            Tambah foto
          </Button>
        )}
      </CldUploadWidget>
      <p className="text-sm text-muted-foreground">
        JPG, PNG, atau WebP, maksimal 5 MB per foto. Foto pertama jadi foto utama.
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Hapus foto ini?"
        description="Foto dihapus dari produk dan dari Cloudinary. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
