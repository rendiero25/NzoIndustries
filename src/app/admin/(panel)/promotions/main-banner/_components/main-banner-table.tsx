"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImageOff, ImagePlus, Images, Pencil, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableRowTextButton,
} from "@/components/admin/admin-table-row-actions";
import {
  deleteBanner,
  toggleBannerStatus,
  updateBanner,
  type BannerRow,
  type UpdateBannerData,
} from "../_actions";

// ---------------------------------------------------------------------------
// Edit Dialog
// ---------------------------------------------------------------------------

function BannerEditDialog({ banner, onClose }: { banner: BannerRow; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(banner.title ?? "");
  const [imageUrl, setImageUrl] = useState(banner.image_url);
  const [linkUrl, setLinkUrl] = useState(banner.link_url ?? "");
  const [sortOrder, setSortOrder] = useState(banner.sort_order);
  const [isActive, setIsActive] = useState(banner.is_active);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append("file", files[0]);
    fd.append("bucket", "banners");

    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
      setImageUrl(json.url as string);
      toast.success("Gambar berhasil diupload.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error("Gambar banner wajib diisi.");
      return;
    }
    const data: UpdateBannerData = {
      title: title || null,
      image_url: imageUrl,
      link_url: linkUrl || null,
      is_active: isActive,
      sort_order: sortOrder,
    };
    startTransition(async () => {
      const { error } = await updateBanner(banner.id, data);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Banner berhasil diperbarui.");
      onClose();
    });
  };

  const labelClass = "text-[11px] font-semibold uppercase text-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title + Sort Order */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>
            Judul <span className="text-foreground/60">(Opsional)</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Flash Sale"
            className="h-10 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Urutan</label>
          <Input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="h-10 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Image */}
      <div className="space-y-1.5">
        <p className={labelClass}>Gambar Banner *</p>
        {imageUrl ? (
          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted/30">
            <Image src={imageUrl} alt="Preview" fill className="object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2"
              aria-label="Hapus gambar"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#e0e0e0] py-10 text-foreground transition-colors",
              "hover:border-brand/50 hover:text-brand",
              uploading && "cursor-not-allowed opacity-50",
            )}
          >
            {uploading ? <Spinner className="size-5 text-brand" /> : <ImagePlus size={20} />}
            <span className="text-[11px] font-semibold uppercase">
              {uploading ? "Mengupload..." : "Upload gambar"}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Link URL */}
      <div className="space-y-1.5">
        <label className={labelClass}>URL Tujuan</label>
        <Input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="/products/samsung-galaxy-s24"
          className="h-10 rounded-lg text-sm"
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <p className={labelClass}>Status</p>
        <StatusPillToggle
          active={isActive}
          onToggle={() => setIsActive((v) => !v)}
          activeLabel="Aktif"
          inactiveLabel="Nonaktif"
          className="w-48 justify-center"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={onClose}
          disabled={isPending || uploading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="flex-1"
          loading={isPending}
          disabled={uploading}
        >
          Simpan Perubahan
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Table
// ---------------------------------------------------------------------------

export function MainBannerTable({ banners }: { banners: BannerRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<BannerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerRow | null>(null);

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const { error } = await toggleBannerStatus(id, !currentActive);
      if (error) toast.error(error);
      else toast.success(!currentActive ? "Banner diaktifkan." : "Banner dinonaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const { error } = await deleteBanner(deleteTarget.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Banner dihapus.");
        setDeleteTarget(null);
      }
    });
  };

  if (banners.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <Images size={36} strokeWidth={1} />
        <p className="text-[11px] font-semibold uppercase">Belum ada banner</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Banner
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                  Link
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {banners.map((banner) => (
                <tr key={banner.id} className="transition-colors hover:bg-muted/30">
                  {/* Thumbnail + title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-md border border-[#e0e0e0] bg-muted/40">
                        {banner.image_url ? (
                          <Image
                            src={banner.image_url}
                            alt={banner.title ?? "Banner"}
                            fill
                            className="object-cover"
                            sizes="72px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageOff size={16} className="text-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] leading-tight font-semibold text-foreground">
                          {banner.title ?? "—"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-foreground">
                          Urutan {banner.sort_order}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Link URL */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {banner.link_url ? (
                      <span className="truncate font-mono text-[11px] text-foreground">
                        {banner.link_url}
                      </span>
                    ) : (
                      <span className="text-[11px] text-foreground/50">—</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 text-center">
                    <AdminStatusBadge active={banner.is_active} showDot />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <AdminTableRowTextButton
                        appearance="filled"
                        onClick={() => setEditTarget(banner)}
                        disabled={isPending}
                      >
                        Edit
                      </AdminTableRowTextButton>

                      <AdminTableDeleteButton
                        onClick={() => setDeleteTarget(banner)}
                        disabled={isPending}
                      >
                        Hapus
                      </AdminTableDeleteButton>

                      {/* Toggle */}
                      <StatusPillToggle
                        active={banner.is_active}
                        onToggle={() => handleToggle(banner.id, banner.is_active)}
                        activeLabel="Nonaktifkan"
                        inactiveLabel="Aktifkan"
                        disabled={isPending}
                        size="compact"
                        className="ml-1"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold">Edit Banner</DialogTitle>
            <DialogDescription className="text-[13px]">
              Perubahan akan langsung diterapkan setelah disimpan.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <BannerEditDialog
              key={editTarget.id}
              banner={editTarget}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold">Hapus Banner?</DialogTitle>
            <DialogDescription className="text-[13px]">
              Banner{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.title ?? "ini"}&quot;
              </span>{" "}
              akan dihapus permanen dan tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleDelete}
              loading={isPending}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
