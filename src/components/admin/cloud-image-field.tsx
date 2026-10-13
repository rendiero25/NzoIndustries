"use client";

import { ImagePlus, X } from "lucide-react";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { CloudinarySection } from "@/lib/cloudinary/folders";

export type CloudConfig = { cloudName: string; apiKey: string } | null;

/**
 * Satu gambar Cloudinary bertanda tangan server (`/api/cloudinary/sign`).
 * Nilai yang dikirim hanya public_id; server memverifikasi ulang sebelum simpan.
 */
export function CloudImageField({
  value,
  onChange,
  section,
  cloud,
  label,
  aspect = "aspect-[3/1]",
  maxBytes = 5 * 1024 * 1024,
}: {
  value: string | null;
  onChange: (publicId: string | null) => void;
  section: Exclude<CloudinarySection, "products">;
  cloud: CloudConfig;
  label: string;
  aspect?: string;
  maxBytes?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={`relative w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted ${aspect}`}
      >
        {value && cloud ? (
          <CldImage
            src={value}
            alt={label}
            fill
            sizes="480px"
            className="object-cover"
            config={{ cloud: { cloudName: cloud.cloudName } }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Belum ada gambar
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {cloud ? (
          <CldUploadWidget
            signatureEndpoint={`/api/cloudinary/sign?section=${section}`}
            config={{ cloud: { cloudName: cloud.cloudName, apiKey: cloud.apiKey } }}
            options={{
              folder: `nzo/${section}`,
              sources: ["local"],
              multiple: false,
              maxFiles: 1,
              clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
              maxFileSize: maxBytes,
              language: "id",
            }}
            onSuccess={(result) => {
              const info = result.info;
              if (info && typeof info !== "string") onChange(info.public_id);
            }}
            onError={() => toast.error("Upload gagal. Coba lagi.")}
          >
            {({ open }) => (
              <Button type="button" variant="secondary" size="sm" onClick={() => open()}>
                <ImagePlus /> {value ? "Ganti gambar" : "Unggah gambar"}
              </Button>
            )}
          </CldUploadWidget>
        ) : (
          <span className="text-sm text-muted-foreground">Cloudinary belum dikonfigurasi.</span>
        )}
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> Lepas
          </Button>
        ) : null}
      </div>
    </div>
  );
}
