"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Upload, Video, Loader2 } from "lucide-react";
import { submitComplaintAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "wrong_item", label: "Barang tidak sesuai pesanan" },
  { value: "damaged", label: "Barang rusak / cacat" },
  { value: "missing_item", label: "Barang kurang / tidak lengkap" },
  { value: "not_as_described", label: "Tidak sesuai deskripsi" },
  { value: "other", label: "Lainnya" },
];

const MAX_FILES = 5;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

export function OrderComplaintForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [resolutionType, setResolutionType] = useState<"product" | "return">("product");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    const remaining = MAX_FILES - mediaUrls.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const results = await Promise.all(
      toUpload.map(async (file) => {
        if (!ALLOWED_MIME.includes(file.type)) {
          toast.error(`${file.name}: format tidak didukung.`);
          return null;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("orderId", orderId);
        const res = await fetch("/api/complaint-upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Upload gagal.");
          return null;
        }
        return json.url as string;
      }),
    );
    setUploading(false);
    setMediaUrls((prev) => [...prev, ...(results.filter(Boolean) as string[])]);
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }

  function isVideo(url: string) {
    return /\.(mp4|mov|webm)$/i.test(url);
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!category) {
          toast.error("Pilih kategori masalah.");
          return;
        }
        const fd = new FormData(e.currentTarget);
        const reason = String(fd.get("reason") ?? "");
        const description = String(fd.get("description") ?? "");
        startTransition(async () => {
          const res = await submitComplaintAction({
            orderId,
            category,
            reason,
            description: description.trim() || null,
            mediaUrls,
            type: resolutionType,
          });
          if (res.success) {
            toast.success("Komplain diajukan. Tim kami akan meninjau.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Kategori masalah
        </Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className="mt-1 border-border">
            <SelectValue placeholder="Pilih kategori..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Apa yang kamu inginkan?
        </Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="resolutionType"
              value="return"
              checked={resolutionType === "return"}
              onChange={() => setResolutionType("return")}
            />
            Tukar / kembalikan barang
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="resolutionType"
              value="product"
              checked={resolutionType === "product"}
              onChange={() => setResolutionType("product")}
            />
            Lainnya (tanpa tukar barang)
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="reason" className="text-xs font-semibold text-muted-foreground uppercase">
          Ringkasan masalah
        </Label>
        <Input
          id="reason"
          name="reason"
          required
          minLength={3}
          className="mt-1 border-border"
          placeholder="Contoh: Barang cacat / salah kirim"
        />
      </div>

      <div>
        <Label
          htmlFor="description"
          className="text-xs font-semibold text-muted-foreground uppercase"
        >
          Detail (opsional)
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          className="mt-1 border-border"
          placeholder="Jelaskan kejadian secara detail."
        />
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Foto / Video bukti (maks {MAX_FILES} file)
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {mediaUrls.map((url) => (
            <div
              key={url}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
            >
              {isVideo(url) ? (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="bukti" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeMedia(url)}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {mediaUrls.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="text-[10px]">{uploading ? "Upload..." : "Tambah"}</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={pending}
        disabled={uploading}
        className="mt-2"
      >
        Ajukan komplain
      </Button>
    </form>
  );
}
