"use client";

import { ImagePlus, Video, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { requestUpload } from "@/server/actions/account/media";

type Bucket = "review-images" | "after-sales-media";

type Item = { path: string; preview: string; isVideo: boolean };

/**
 * Unggah foto/video ke Supabase Storage lewat tiket dari server (path & tipe
 * ditentukan server). Mengembalikan daftar path ke form induk.
 */
export function MediaUploader({
  bucket,
  max,
  onChange,
  label,
}: {
  bucket: Bucket;
  max: number;
  onChange: (paths: string[]) => void;
  label: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const accept =
    bucket === "review-images"
      ? "image/jpeg,image/png,image/webp"
      : "image/jpeg,image/png,image/webp,video/mp4";

  // Lepas URL pratinjau saat komponen dilepas (yang dihapus dilepas di remove()).
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - items.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast.info(`Maksimal ${max} file.`);
    setBusy(true);
    const added: Item[] = [];
    for (const file of picked) {
      const ticket = await requestUpload({ bucket, contentType: file.type, size: file.size });
      if (!ticket.ok) {
        toast.error(`${file.name}: ${ticket.error}`);
        continue;
      }
      const { error } = await createClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (error) {
        toast.error(`${file.name}: unggahan gagal.`);
        continue;
      }
      added.push({
        path: ticket.path,
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (added.length) {
      const next = [...items, ...added];
      setItems(next);
      onChange(next.map((i) => i.path));
    }
  }

  function remove(path: string) {
    const gone = items.find((i) => i.path === path);
    if (gone) URL.revokeObjectURL(gone.preview);
    const next = items.filter((i) => i.path !== path);
    setItems(next);
    onChange(next.map((i) => i.path));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <ul className="flex flex-wrap gap-2">
        {items.map((i) => (
          <li
            key={i.path}
            className="relative size-20 overflow-hidden rounded-md border border-border bg-steel-50"
          >
            {i.isVideo ? (
              <div className="flex size-full items-center justify-center text-steel-700">
                <Video className="size-6" strokeWidth={1.75} aria-label="Video" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob:)
              <img src={i.preview} alt="" className="size-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => remove(i.path)}
              className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-brand-black/70 text-white"
              aria-label="Hapus file"
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        {items.length < max ? (
          <li>
            <label
              htmlFor={inputId}
              className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-caption text-steel-700 hover:border-steel-500"
            >
              {busy ? (
                <Spinner className="size-4" />
              ) : (
                <ImagePlus className="size-5" strokeWidth={1.75} />
              )}
              {busy ? "Mengunggah" : "Tambah"}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => void onFiles(e.target.files)}
            />
          </li>
        ) : null}
      </ul>
      <p className="text-caption text-muted-foreground">
        {bucket === "review-images"
          ? `Opsional, maks ${max} foto JPG/PNG/WebP, masing-masing ≤ 2 MB.`
          : `Maks ${max} foto atau video MP4, masing-masing ≤ 10 MB.`}
      </p>
    </div>
  );
}
