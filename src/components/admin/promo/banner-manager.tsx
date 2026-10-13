"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { CldImage } from "next-cloudinary";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CloudImageField, type CloudConfig } from "@/components/admin/cloud-image-field";
import { nativeSelectClass } from "@/components/admin/form-styles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  bannerSchema,
  toWibInput,
  type BannerPlacement,
  type BannerValues,
} from "@/lib/validations/admin-promo";
import { deleteBanner, moveBanner, saveBanner } from "@/server/actions/admin/promo";
import type { AdminBanner } from "@/server/queries/admin/promo";

const PLACEMENTS: { key: BannerPlacement; title: string; hint: string }[] = [
  {
    key: "promo_bar",
    title: "Bar promo",
    hint: "Teks tipis di atas header. Hanya yang teratas yang tampil.",
  },
  {
    key: "hero",
    title: "Banner utama",
    hint: "Carousel di beranda. Gambar 3:1 (desktop) dan 4:5 (mobile).",
  },
  { key: "promo", title: "Banner promo", hint: "Banner kedua di beranda." },
  { key: "category", title: "Banner kategori", hint: "Disiapkan untuk halaman kategori." },
];

const dt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function bannerState(b: AdminBanner, now: number) {
  if (!b.isActive) return { label: "Nonaktif", variant: "outline" as const };
  if (b.endsAt && new Date(b.endsAt).getTime() <= now)
    return { label: "Berakhir", variant: "outline" as const };
  if (b.startsAt && new Date(b.startsAt).getTime() > now)
    return { label: "Terjadwal", variant: "outline" as const };
  return { label: "Tayang", variant: "secondary" as const };
}

type Editing =
  { mode: "create"; placement: BannerPlacement } | { mode: "edit"; banner: AdminBanner };

export function BannerManager({
  banners,
  cloud,
  now,
}: {
  banners: AdminBanner[];
  cloud: CloudConfig;
  now: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);
  const [pending, start] = useTransition();

  const move = (id: string, direction: "up" | "down") =>
    start(async () => {
      const res = await moveBanner(id, direction);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  const confirmDelete = () => {
    if (!deleting) return;
    start(async () => {
      const res = await deleteBanner(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Banner dihapus.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {PLACEMENTS.map((p) => {
        const list = banners.filter((b) => b.placement === p.key);
        return (
          <Card key={p.key}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <CardDescription>{p.hint}</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditing({ mode: "create", placement: p.key })}>
                <Plus /> Tambah
              </Button>
            </CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada. Bagian ini tidak tampil di toko.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {list.map((b, i) => {
                    const state = bannerState(b, now);
                    return (
                      <li key={b.id} className="flex flex-wrap items-center gap-3 p-3">
                        {p.key !== "promo_bar" ? (
                          <div className="relative aspect-[3/1] w-36 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {b.imagePublicId && cloud ? (
                              <CldImage
                                src={b.imagePublicId}
                                alt={b.title ?? "Banner"}
                                fill
                                sizes="144px"
                                className="object-cover"
                                config={{ cloud: { cloudName: cloud.cloudName } }}
                              />
                            ) : (
                              <ImageIcon
                                className="absolute inset-0 m-auto size-5 text-muted-foreground"
                                aria-hidden
                              />
                            )}
                          </div>
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {b.title ?? "(tanpa judul)"}
                            <Badge variant={state.variant}>{state.label}</Badge>
                          </span>
                          <span className="truncate text-caption text-muted-foreground">
                            {b.linkUrl ?? "Tanpa link"}
                            {b.startsAt || b.endsAt
                              ? ` · ${b.startsAt ? dt.format(new Date(b.startsAt)) : "sekarang"} – ${b.endsAt ? dt.format(new Date(b.endsAt)) : "tanpa batas"}`
                              : ""}
                          </span>
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Naikkan"
                            disabled={i === 0 || pending}
                            onClick={() => move(b.id, "up")}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Turunkan"
                            disabled={i === list.length - 1 || pending}
                            onClick={() => move(b.id, "down")}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ubah banner"
                            onClick={() => setEditing({ mode: "edit", banner: b })}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="destructive-ghost"
                            size="icon-sm"
                            aria-label="Hapus banner"
                            onClick={() => setDeleting(b)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      <BannerDialog editing={editing} cloud={cloud} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus banner ini?"
        description="Gambar tetap tersimpan di Cloudinary."
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function BannerDialog({
  editing,
  cloud,
  onClose,
}: {
  editing: Editing | null;
  cloud: CloudConfig;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = editing?.mode === "edit" ? editing.banner : null;

  const defaults = (): BannerValues =>
    current
      ? {
          placement: current.placement,
          title: current.title ?? "",
          subtitle: current.subtitle ?? "",
          imagePublicId: current.imagePublicId ?? "",
          mobileImagePublicId: current.mobileImagePublicId ?? "",
          linkUrl: current.linkUrl ?? "",
          startsAt: toWibInput(current.startsAt),
          endsAt: toWibInput(current.endsAt),
          isActive: current.isActive,
        }
      : {
          placement: editing?.mode === "create" ? editing.placement : "hero",
          title: "",
          subtitle: "",
          imagePublicId: "",
          mobileImagePublicId: "",
          linkUrl: "",
          startsAt: "",
          endsAt: "",
          isActive: true,
        };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<BannerValues>({ resolver: zodResolver(bannerSchema), defaultValues: defaults() });

  useEffect(() => {
    if (editing) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const placement = useWatch({ control, name: "placement" });
  const isActive = useWatch({ control, name: "isActive" });
  const isBar = placement === "promo_bar";

  const onSubmit = (values: BannerValues) =>
    start(async () => {
      const res = await saveBanner(current?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(current ? "Banner disimpan." : "Banner ditambahkan.");
      onClose();
      router.refresh();
    });

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{current ? "Ubah banner" : "Tambah banner"}</DialogTitle>
          <DialogDescription>
            Link internal diawali &ldquo;/&rdquo;, link luar wajib https://. Waktu dalam WIB.
          </DialogDescription>
        </DialogHeader>
        <form
          id="banner-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-place">Posisi</Label>
            <select id="bn-place" className={nativeSelectClass} {...register("placement")}>
              {PLACEMENTS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-title">
              {isBar ? "Teks bar promo" : "Judul (opsional, untuk teks alternatif)"}
            </Label>
            <Input id="bn-title" aria-invalid={!!errors.title} {...register("title")} />
            {errors.title ? <p className="text-sm text-danger">{errors.title.message}</p> : null}
          </div>
          {!isBar ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bn-sub">Subjudul (opsional)</Label>
                <Input id="bn-sub" {...register("subtitle")} />
              </div>
              <Controller
                control={control}
                name="imagePublicId"
                render={({ field }) => (
                  <CloudImageField
                    label="Gambar desktop"
                    section="banners"
                    cloud={cloud}
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                  />
                )}
              />
              {errors.imagePublicId ? (
                <p className="text-sm text-danger">{errors.imagePublicId.message}</p>
              ) : null}
              <Controller
                control={control}
                name="mobileImagePublicId"
                render={({ field }) => (
                  <CloudImageField
                    label="Gambar mobile (opsional)"
                    section="banners"
                    cloud={cloud}
                    aspect="aspect-[4/5] max-w-48"
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                  />
                )}
              />
            </>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-link">Link (opsional)</Label>
            <Input
              id="bn-link"
              placeholder="/promo"
              aria-invalid={!!errors.linkUrl}
              {...register("linkUrl")}
            />
            {errors.linkUrl ? (
              <p className="text-sm text-danger">{errors.linkUrl.message}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-start">Mulai (opsional)</Label>
              <Input id="bn-start" type="datetime-local" {...register("startsAt")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-end">Selesai (opsional)</Label>
              <Input
                id="bn-end"
                type="datetime-local"
                aria-invalid={!!errors.endsAt}
                {...register("endsAt")}
              />
              {errors.endsAt ? (
                <p className="text-sm text-danger">{errors.endsAt.message}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="bn-active">Aktif</Label>
            <Switch
              id="bn-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="banner-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
