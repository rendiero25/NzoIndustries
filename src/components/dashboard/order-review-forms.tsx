"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { submitProductReviewAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_IMAGE_MAX_SIZE_MB,
  REVIEW_IMAGE_MIME_TYPES,
  REVIEW_IMAGES_MAX,
} from "@/lib/constants/review-images";
import type { DashboardOrderItemRow } from "@/lib/data/dashboard-user";

export function OrderReviewForms({
  orderId,
  items,
  reviewedProductIds,
}: {
  orderId: string;
  items: DashboardOrderItemRow[];
  reviewedProductIds: string[];
}) {
  const reviewable = items.filter(
    (it) => it.product_id && !reviewedProductIds.includes(it.product_id),
  );

  if (reviewable.length === 0) {
    return (
      <p className="text-sm text-[#5c5c5c]">
        Semua produk pada pesanan ini sudah memiliki ulasan dari Anda, atau tidak terhubung ke
        katalog untuk ulasan.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {reviewable.map((it) => (
        <ReviewItemForm key={it.id} orderId={orderId} item={it} />
      ))}
    </div>
  );
}

async function uploadReviewImage(file: File): Promise<string | null> {
  if (!REVIEW_IMAGE_MIME_TYPES.includes(file.type)) {
    toast.error(`${file.name}: format tidak didukung. Gunakan JPG, PNG, atau WEBP.`);
    return null;
  }
  if (file.size > REVIEW_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    toast.error(`${file.name}: ukuran maksimal ${REVIEW_IMAGE_MAX_SIZE_MB} MB.`);
    return null;
  }
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/review-upload", { method: "POST", body: fd });
    const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
    if (!json.success || !json.data) {
      toast.error(json.error ?? "Upload foto gagal.");
      return null;
    }
    return json.data.url;
  } catch {
    toast.error("Upload foto gagal. Coba lagi.");
    return null;
  }
}

function ReviewItemForm({ orderId, item }: { orderId: string; item: DashboardOrderItemRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    const toUpload = Array.from(files).slice(0, REVIEW_IMAGES_MAX - images.length);
    if (toUpload.length === 0) return;
    setUploading(true);
    const urls = await Promise.all(toUpload.map(uploadReviewImage));
    setUploading(false);
    setImages((prev) =>
      [...prev, ...urls.filter((u): u is string => !!u)].slice(0, REVIEW_IMAGES_MAX),
    );
  }

  return (
    <form
      className="rounded-xl border border-[#e0e0e0] bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (uploading) {
          toast.error("Tunggu upload foto selesai.");
          return;
        }
        const fd = new FormData(e.currentTarget);
        const rating = Number(fd.get("rating"));
        const comment = String(fd.get("comment") ?? "");
        startTransition(async () => {
          const res = await submitProductReviewAction({
            orderId,
            productId: item.product_id!,
            rating,
            comment: comment.trim() || null,
            images,
          });
          if (res.success) {
            toast.success("Terima kasih sudah memberikan ulasan.");
            router.push(`/dashboard/orders/${orderId}`);
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <p className="font-semibold text-[#1d1d1f]">{item.product_name}</p>
      <p className="text-xs text-[#7a7a7a]">{item.variant_name}</p>
      <div className="mt-4">
        <Label
          htmlFor={`rating-${item.id}`}
          className="text-xs font-semibold text-[#7a7a7a] uppercase"
        >
          Rating
        </Label>
        <select
          id={`rating-${item.id}`}
          name="rating"
          required
          className="mt-1 h-10 w-full max-w-xs rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm"
          defaultValue={5}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} bintang
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <Label
          htmlFor={`comment-${item.id}`}
          className="text-xs font-semibold text-[#7a7a7a] uppercase"
        >
          Komentar (opsional)
        </Label>
        <Textarea
          id={`comment-${item.id}`}
          name="comment"
          rows={4}
          className="mt-1 border-[#e0e0e0]"
          placeholder="Ceritakan pengalamanmu dengan produk ini."
        />
      </div>
      <div className="mt-4">
        <Label className="text-xs font-semibold text-[#7a7a7a] uppercase">
          Foto produk (opsional, maks {REVIEW_IMAGES_MAX})
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((url) => (
            <div
              key={url}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#e0e0e0]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Foto ulasan" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Hapus foto"
                onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < REVIEW_IMAGES_MAX && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c0c0c0] bg-[#fafafa] text-[#a0a0a0] hover:border-[#EA5329] hover:text-[#EA5329] disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
              <span className="text-[10px]">{uploading ? "Upload..." : "Tambah"}</span>
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-[#7a7a7a]">
          JPG, PNG, atau WEBP. Maks {REVIEW_IMAGE_MAX_SIZE_MB} MB per foto.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={REVIEW_IMAGE_MIME_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        disabled={uploading}
        className="mt-4"
      >
        Kirim ulasan
      </Button>
    </form>
  );
}
