"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/import/slug";
import { brandSchema, type BrandValues } from "@/lib/validations/admin-catalog";
import { deleteBrand, saveBrand } from "@/server/actions/admin/catalog";
import type { AdminBrand } from "@/server/queries/admin/catalog";

type Cloud = { cloudName: string; apiKey: string } | null;

export function BrandManager({ brands, cloud }: { brands: AdminBrand[]; cloud: Cloud }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminBrand | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminBrand | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? brands.filter((b) => b.name.toLowerCase().includes(needle) || b.slug.includes(needle))
      : brands;
  }, [brands, q]);

  const confirmDelete = () => {
    if (!deleting) return;
    start(async () => {
      const res = await deleteBrand(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Brand "${deleting.name}" dihapus.`);
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari brand"
            aria-label="Cari brand"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Tambah brand
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={q ? "Brand tidak ditemukan" : "Belum ada brand"}
          description={q ? "Coba kata lain." : "Tambah brand pertama."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Logo</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Produk</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <BrandLogo publicId={b.logoPublicId} name={b.name} cloud={cloud} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{b.name}</span>
                      <span className="font-mono text-caption text-muted-foreground">{b.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {b.isActive ? (
                      <Badge variant="secondary">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b.productCount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ubah ${b.name}`}
                        onClick={() => setEditing(b)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="destructive-ghost"
                        size="icon-sm"
                        aria-label={`Hapus ${b.name}`}
                        onClick={() => setDeleting(b)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BrandDialog editing={editing} cloud={cloud} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus brand "${deleting?.name ?? ""}"?`}
        description="Brand yang masih dipakai produk tidak bisa dihapus. Nonaktifkan saja untuk menyembunyikannya dari toko."
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function BrandLogo({
  publicId,
  name,
  cloud,
}: {
  publicId: string | null;
  name: string;
  cloud: Cloud;
}) {
  if (!publicId || !cloud) {
    return (
      <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-muted-foreground">
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <CldImage
      src={publicId}
      alt={`Logo ${name}`}
      width={80}
      height={80}
      crop="pad"
      className="size-10 rounded-md border border-border bg-white object-contain"
      config={{ cloud: { cloudName: cloud.cloudName } }}
    />
  );
}

function BrandDialog({
  editing,
  cloud,
  onClose,
}: {
  editing: AdminBrand | "new" | null;
  cloud: Cloud;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;

  const defaults = (): BrandValues =>
    current
      ? {
          name: current.name,
          slug: current.slug,
          description: current.description ?? "",
          logoPublicId: current.logoPublicId ?? "",
          isActive: current.isActive,
        }
      : { name: "", slug: "", description: "", logoPublicId: "", isActive: true };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = useForm<BrandValues>({ resolver: zodResolver(brandSchema), defaultValues: defaults() });

  useEffect(() => {
    if (editing) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const logo = useWatch({ control, name: "logoPublicId" });
  const isActive = useWatch({ control, name: "isActive" });
  const name = useWatch({ control, name: "name" });

  const onSubmit = (values: BrandValues) =>
    start(async () => {
      const res = await saveBrand(current?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(current ? "Brand disimpan." : "Brand ditambahkan.");
      onClose();
      router.refresh();
    });

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{current ? "Ubah brand" : "Tambah brand"}</DialogTitle>
          <DialogDescription>Slug dipakai di URL toko: /brands/slug.</DialogDescription>
        </DialogHeader>
        <form
          id="brand-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-name">Nama</Label>
            <Input
              id="b-name"
              aria-invalid={!!errors.name}
              {...register("name", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!current && !dirtyFields.slug) setValue("slug", slugify(e.target.value, 60));
                },
              })}
            />
            {errors.name ? <p className="text-sm text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-slug">Slug</Label>
            <Input
              id="b-slug"
              className="font-mono"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            {errors.slug ? <p className="text-sm text-danger">{errors.slug.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-desc">Deskripsi (opsional)</Label>
            <Textarea id="b-desc" rows={3} {...register("description")} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex items-center gap-3">
              <BrandLogo publicId={logo || null} name={name || "?"} cloud={cloud} />
              {cloud ? (
                <CldUploadWidget
                  signatureEndpoint="/api/cloudinary/sign?section=brands"
                  config={{ cloud: { cloudName: cloud.cloudName, apiKey: cloud.apiKey } }}
                  options={{
                    folder: "nzo/brands",
                    sources: ["local"],
                    multiple: false,
                    maxFiles: 1,
                    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                    maxFileSize: 2 * 1024 * 1024,
                    language: "id",
                  }}
                  onSuccess={(result) => {
                    const info = result.info;
                    if (info && typeof info !== "string")
                      setValue("logoPublicId", info.public_id, { shouldDirty: true });
                  }}
                  onError={() => toast.error("Upload gagal. Coba lagi.")}
                >
                  {({ open }) => (
                    <Button type="button" variant="secondary" size="sm" onClick={() => open()}>
                      <ImagePlus /> {logo ? "Ganti logo" : "Unggah logo"}
                    </Button>
                  )}
                </CldUploadWidget>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Cloudinary belum dikonfigurasi.
                </span>
              )}
              {logo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue("logoPublicId", "", { shouldDirty: true })}
                >
                  <X /> Lepas
                </Button>
              ) : null}
            </div>
            {errors.logoPublicId ? (
              <p className="text-sm text-danger">{errors.logoPublicId.message}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="b-active">Tampil di toko</Label>
            <Switch
              id="b-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="brand-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
