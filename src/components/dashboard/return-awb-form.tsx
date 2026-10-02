"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReturnAWBAction } from "@/app/(dashboard)/dashboard/orders/_actions";

const MAX_FILES = 5;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

export function ReturnAwbForm({ returnId, orderId }: { returnId: string; orderId: string }) {
  const [courier, setCourier] = useState("");
  const [awb, setAwb] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courier.trim() || !awb.trim()) return;
    startTransition(async () => {
      const res = await submitReturnAWBAction(returnId, awb, courier, mediaUrls);
      if (res.success) {
        toast.success("Resi berhasil dikirim. Menunggu konfirmasi dari tim NZO Industries.");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase">Nama kurir</Label>
        <Input
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          required
          placeholder="Contoh: JNE, J&T, SiCepat"
          className="mt-1 border-border"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase">Nomor resi</Label>
        <Input
          value={awb}
          onChange={(e) => setAwb(e.target.value)}
          required
          placeholder="Masukkan nomor resi pengiriman"
          className="mt-1 border-border"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase">
          Foto bukti pengiriman (maks {MAX_FILES})
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {mediaUrls.map((url) => (
            <div
              key={url}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="bukti" className="h-full w-full object-cover" />
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
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
      <Button type="submit" variant="primary" loading={pending} disabled={uploading}>
        Konfirmasi Sudah Kirim
      </Button>
    </form>
  );
}
