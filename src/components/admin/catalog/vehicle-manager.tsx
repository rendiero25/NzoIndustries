"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bike, Car, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { nativeSelectClass } from "@/components/admin/form-styles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { slugify } from "@/lib/import/slug";
import { cn } from "@/lib/utils";
import {
  vehicleMakeSchema,
  vehicleModelSchema,
  type VehicleMakeValues,
  type VehicleModelValues,
} from "@/lib/validations/admin-catalog";
import {
  deleteVehicleMake,
  deleteVehicleModel,
  saveVehicleMake,
  saveVehicleModel,
} from "@/server/actions/admin/catalog";
import type { AdminVehicleMake, AdminVehicleModel } from "@/server/queries/admin/catalog";

const TYPE_LABEL = { motorcycle: "Motor", car: "Mobil" } as const;

type Deleting =
  { kind: "make"; item: AdminVehicleMake } | { kind: "model"; item: AdminVehicleModel };

export function VehicleManager({
  makes,
  selected,
  models,
}: {
  makes: AdminVehicleMake[];
  selected: AdminVehicleMake | null;
  models: AdminVehicleModel[];
}) {
  const router = useRouter();
  const [makeEdit, setMakeEdit] = useState<AdminVehicleMake | "new" | null>(null);
  const [modelEdit, setModelEdit] = useState<AdminVehicleModel | "new" | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [pending, start] = useTransition();

  const confirmDelete = () => {
    if (!deleting) return;
    start(async () => {
      const res =
        deleting.kind === "make"
          ? await deleteVehicleMake(deleting.item.id)
          : await deleteVehicleModel(deleting.item.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${deleting.item.name} dihapus.`);
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Merek</CardTitle>
          <Button size="sm" onClick={() => setMakeEdit("new")}>
            <Plus /> Merek
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-2">
          {(["motorcycle", "car"] as const).map((type) => {
            const list = makes.filter((m) => m.vehicleType === type);
            const Icon = type === "car" ? Car : Bike;
            return (
              <div key={type} className="flex flex-col gap-1">
                <span className="flex items-center gap-2 px-2 text-caption font-medium text-muted-foreground uppercase">
                  <Icon className="size-4" aria-hidden /> {TYPE_LABEL[type]}
                </span>
                {list.length === 0 ? (
                  <p className="px-2 text-sm text-muted-foreground">Belum ada merek.</p>
                ) : (
                  <ul className="flex flex-col">
                    {list.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/admin/vehicles?make=${m.id}`}
                          aria-current={selected?.id === m.id ? "true" : undefined}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                            selected?.id === m.id && "bg-muted font-medium",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {m.name}
                            {!m.isActive ? <Badge variant="outline">Nonaktif</Badge> : null}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{m.modelCount}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        {selected ? (
          <>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  {selected.name}
                  <Badge variant="secondary">{TYPE_LABEL[selected.vehicleType]}</Badge>
                  {!selected.isActive ? <Badge variant="outline">Nonaktif</Badge> : null}
                </CardTitle>
                <span className="font-mono text-caption text-muted-foreground">
                  {selected.slug}
                </span>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setMakeEdit(selected)}>
                  <Pencil /> Ubah merek
                </Button>
                <Button
                  variant="destructive-ghost"
                  size="icon-sm"
                  aria-label={`Hapus merek ${selected.name}`}
                  onClick={() => setDeleting({ kind: "make", item: selected })}
                >
                  <Trash2 />
                </Button>
                <Button size="sm" onClick={() => setModelEdit("new")}>
                  <Plus /> Model
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <EmptyState
                  icon={selected.vehicleType === "car" ? Car : Bike}
                  title="Belum ada model"
                  description="Tambah model untuk merek ini."
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Tahun</TableHead>
                        <TableHead className="text-right">Kecocokan</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2 font-medium">
                                {m.name}
                                {!m.isActive ? <Badge variant="outline">Nonaktif</Badge> : null}
                              </span>
                              <span className="font-mono text-caption text-muted-foreground">
                                {m.slug}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {m.yearStart}–{m.yearEnd ?? "sekarang"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.fitmentCount.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Ubah ${m.name}`}
                                onClick={() => setModelEdit(m)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="destructive-ghost"
                                size="icon-sm"
                                aria-label={`Hapus ${m.name}`}
                                onClick={() => setDeleting({ kind: "model", item: m })}
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
            </CardContent>
          </>
        ) : (
          <CardContent className="py-10">
            <EmptyState
              icon={Bike}
              title="Pilih merek"
              description="Pilih merek di kiri untuk melihat dan mengelola modelnya."
            />
          </CardContent>
        )}
      </Card>

      <MakeDialog editing={makeEdit} onClose={() => setMakeEdit(null)} />
      {selected ? (
        <ModelDialog make={selected} editing={modelEdit} onClose={() => setModelEdit(null)} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus ${deleting?.kind === "make" ? "merek" : "model"} "${deleting?.item.name ?? ""}"?`}
        description={
          deleting?.kind === "make"
            ? "Merek yang masih punya model tidak bisa dihapus."
            : "Model yang dipakai kecocokan produk atau garasi pelanggan tidak bisa dihapus. Nonaktifkan saja."
        }
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function MakeDialog({
  editing,
  onClose,
}: {
  editing: AdminVehicleMake | "new" | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;
  const defaults = (): VehicleMakeValues =>
    current
      ? {
          name: current.name,
          slug: current.slug,
          vehicleType: current.vehicleType,
          isActive: current.isActive,
        }
      : { name: "", slug: "", vehicleType: "motorcycle", isActive: true };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = useForm<VehicleMakeValues>({
    resolver: zodResolver(vehicleMakeSchema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (editing) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const onSubmit = (values: VehicleMakeValues) =>
    start(async () => {
      const res = await saveVehicleMake(current?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(current ? "Merek disimpan." : "Merek ditambahkan.");
      onClose();
      router.refresh();
    });

  const isActive = useWatch({ control, name: "isActive" });

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{current ? "Ubah merek" : "Tambah merek"}</DialogTitle>
          <DialogDescription>
            Merek kendaraan untuk pemilih kendaraan dan kecocokan produk.
          </DialogDescription>
        </DialogHeader>
        <form
          id="make-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mk-name">Nama</Label>
            <Input
              id="mk-name"
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
            <Label htmlFor="mk-slug">Slug</Label>
            <Input
              id="mk-slug"
              className="font-mono"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            {errors.slug ? <p className="text-sm text-danger">{errors.slug.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mk-type">Jenis</Label>
            <select id="mk-type" className={nativeSelectClass} {...register("vehicleType")}>
              <option value="motorcycle">Motor</option>
              <option value="car">Mobil</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="mk-active">Tampil di pemilih kendaraan</Label>
            <Switch
              id="mk-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="make-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelDialog({
  make,
  editing,
  onClose,
}: {
  make: AdminVehicleMake;
  editing: AdminVehicleModel | "new" | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;
  const defaults = (): VehicleModelValues =>
    current
      ? {
          makeId: make.id,
          name: current.name,
          slug: current.slug,
          yearStart: current.yearStart,
          yearEnd: current.yearEnd ?? "",
          isActive: current.isActive,
        }
      : {
          makeId: make.id,
          name: "",
          slug: "",
          yearStart: new Date().getFullYear(),
          yearEnd: "",
          isActive: true,
        };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = useForm<VehicleModelValues>({
    resolver: zodResolver(vehicleModelSchema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (editing) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const onSubmit = (values: VehicleModelValues) =>
    start(async () => {
      const res = await saveVehicleModel(current?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(current ? "Model disimpan." : "Model ditambahkan.");
      onClose();
      router.refresh();
    });

  const isActive = useWatch({ control, name: "isActive" });

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{current ? "Ubah model" : `Tambah model ${make.name}`}</DialogTitle>
          <DialogDescription>
            Rentang tahun produksi dipakai untuk mencocokkan produk.
          </DialogDescription>
        </DialogHeader>
        <form
          id="model-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="md-name">Nama model</Label>
            <Input
              id="md-name"
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
            <Label htmlFor="md-slug">Slug</Label>
            <Input
              id="md-slug"
              className="font-mono"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            {errors.slug ? <p className="text-sm text-danger">{errors.slug.message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="md-ys">Tahun mulai</Label>
              <Input
                id="md-ys"
                inputMode="numeric"
                aria-invalid={!!errors.yearStart}
                {...register("yearStart")}
              />
              {errors.yearStart ? (
                <p className="text-sm text-danger">{errors.yearStart.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="md-ye">Tahun akhir</Label>
              <Input
                id="md-ye"
                inputMode="numeric"
                placeholder="Masih diproduksi"
                aria-invalid={!!errors.yearEnd}
                {...register("yearEnd")}
              />
              {errors.yearEnd ? (
                <p className="text-sm text-danger">{errors.yearEnd.message}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="md-active">Tampil di pemilih kendaraan</Label>
            <Switch
              id="md-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="model-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
