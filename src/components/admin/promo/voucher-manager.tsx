"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Ticket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { nativeSelectClass } from "@/components/admin/form-styles";
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
import { formatIDR } from "@/lib/money";
import { toWibInput, voucherSchema, type VoucherValues } from "@/lib/validations/admin-promo";
import { deleteVoucher, saveVoucher } from "@/server/actions/admin/promo";
import type { AdminVoucher } from "@/server/queries/admin/promo";

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function voucherState(
  v: AdminVoucher,
  now: number,
): { label: string; variant: "secondary" | "outline" | "destructive" } {
  if (!v.isActive) return { label: "Nonaktif", variant: "outline" };
  if (v.endsAt && new Date(v.endsAt).getTime() <= now)
    return { label: "Berakhir", variant: "outline" };
  if (v.startsAt && new Date(v.startsAt).getTime() > now)
    return { label: "Terjadwal", variant: "outline" };
  if (v.usageLimit !== null && v.usedCount >= v.usageLimit)
    return { label: "Kuota habis", variant: "destructive" };
  return { label: "Berjalan", variant: "secondary" };
}

export function VoucherManager({ vouchers, now }: { vouchers: AdminVoucher[]; now: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminVoucher | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminVoucher | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toUpperCase();
    return needle ? vouchers.filter((v) => v.code.includes(needle)) : vouchers;
  }, [vouchers, q]);

  const confirmDelete = () => {
    if (!deleting) return;
    start(async () => {
      const res = await deleteVoucher(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Voucher ${deleting.code} dihapus.`);
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
            placeholder="Cari kode"
            aria-label="Cari kode voucher"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Buat voucher
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={q ? "Voucher tidak ditemukan" : "Belum ada voucher"}
          description={q ? "Coba kode lain." : "Buat voucher pertama."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Dipakai</TableHead>
                <TableHead className="text-right">Total potongan</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((v) => {
                const state = voucherState(v, now);
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2 font-mono font-semibold">
                          {v.code}
                          {v.isPublic ? <Badge variant="secondary">Publik</Badge> : null}
                        </span>
                        {v.description ? (
                          <span className="line-clamp-1 text-caption text-muted-foreground">
                            {v.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {v.discountType === "percent"
                        ? `${v.discountValue}%`
                        : formatIDR(v.discountValue)}
                      {v.maxDiscount ? (
                        <span className="block text-caption text-muted-foreground">
                          maks {formatIDR(v.maxDiscount)}
                        </span>
                      ) : null}
                      {v.minSubtotal ? (
                        <span className="block text-caption text-muted-foreground">
                          min {formatIDR(v.minSubtotal)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {v.startsAt ? date.format(new Date(v.startsAt)) : "Sekarang"} –{" "}
                      {v.endsAt ? date.format(new Date(v.endsAt)) : "tanpa batas"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {v.usedCount}
                      {v.usageLimit !== null ? ` / ${v.usageLimit}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIDR(v.totalDiscount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ubah ${v.code}`}
                          onClick={() => setEditing(v)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="destructive-ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${v.code}`}
                          onClick={() => setDeleting(v)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <VoucherDialog editing={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus voucher ${deleting?.code ?? ""}?`}
        description="Voucher yang sudah pernah dipakai tidak bisa dihapus (riwayat pesanan tetap tersimpan). Nonaktifkan saja."
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function VoucherDialog({
  editing,
  onClose,
}: {
  editing: AdminVoucher | "new" | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;

  const defaults = (): VoucherValues =>
    current
      ? {
          code: current.code,
          description: current.description ?? "",
          discountType: current.discountType,
          discountValue: current.discountValue,
          maxDiscount: current.maxDiscount ?? "",
          minSubtotal: current.minSubtotal,
          usageLimit: current.usageLimit ?? "",
          perUserLimit: current.perUserLimit,
          startsAt: toWibInput(current.startsAt),
          endsAt: toWibInput(current.endsAt),
          isActive: current.isActive,
          isPublic: current.isPublic,
        }
      : {
          code: "",
          description: "",
          discountType: "percent",
          discountValue: 10,
          maxDiscount: "",
          minSubtotal: 0,
          usageLimit: "",
          perUserLimit: 1,
          startsAt: "",
          endsAt: "",
          isActive: true,
          isPublic: false,
        };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<VoucherValues>({ resolver: zodResolver(voucherSchema), defaultValues: defaults() });

  useEffect(() => {
    if (editing) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const type = useWatch({ control, name: "discountType" });
  const isActive = useWatch({ control, name: "isActive" });
  const isPublic = useWatch({ control, name: "isPublic" });

  const onSubmit = (values: VoucherValues) =>
    start(async () => {
      const res = await saveVoucher(current?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(current ? "Voucher disimpan." : "Voucher dibuat.");
      onClose();
      router.refresh();
    });

  const err = (key: keyof VoucherValues) =>
    errors[key]?.message ? (
      <p className="text-sm text-danger">{String(errors[key]?.message)}</p>
    ) : null;

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{current ? `Ubah voucher ${current.code}` : "Buat voucher"}</DialogTitle>
          <DialogDescription>
            Potongan dihitung ulang di server saat checkout. Waktu dalam WIB.
          </DialogDescription>
        </DialogHeader>
        <form
          id="voucher-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-code">Kode</Label>
            <Input
              id="v-code"
              className="font-mono uppercase"
              aria-invalid={!!errors.code}
              {...register("code")}
            />
            {err("code")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-type">Jenis potongan</Label>
            <select id="v-type" className={nativeSelectClass} {...register("discountType")}>
              <option value="percent">Persen (%)</option>
              <option value="fixed">Nominal (Rp)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="v-desc">
              Deskripsi (tampil di &ldquo;Voucher saya&rdquo; bila publik)
            </Label>
            <Input id="v-desc" {...register("description")} />
            {err("description")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-value">{type === "percent" ? "Persen" : "Nominal (Rp)"}</Label>
            <Input
              id="v-value"
              inputMode="numeric"
              aria-invalid={!!errors.discountValue}
              {...register("discountValue")}
            />
            {err("discountValue")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-max">Maks potongan (Rp, opsional)</Label>
            <Input
              id="v-max"
              inputMode="numeric"
              disabled={type !== "percent"}
              {...register("maxDiscount")}
            />
            {err("maxDiscount")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-min">Minimal belanja (Rp)</Label>
            <Input id="v-min" inputMode="numeric" {...register("minSubtotal")} />
            {err("minSubtotal")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-limit">Kuota total (opsional)</Label>
            <Input
              id="v-limit"
              inputMode="numeric"
              placeholder="Tanpa batas"
              {...register("usageLimit")}
            />
            {err("usageLimit")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-per-user">Maks per pelanggan</Label>
            <Input id="v-per-user" inputMode="numeric" {...register("perUserLimit")} />
            {err("perUserLimit")}
          </div>
          <div className="hidden sm:block" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-start">Mulai (opsional)</Label>
            <Input id="v-start" type="datetime-local" {...register("startsAt")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-end">Selesai (opsional)</Label>
            <Input
              id="v-end"
              type="datetime-local"
              aria-invalid={!!errors.endsAt}
              {...register("endsAt")}
            />
            {err("endsAt")}
          </div>
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <Label htmlFor="v-active">Aktif</Label>
            <Switch
              id="v-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div className="flex flex-col">
              <Label htmlFor="v-public">Tampilkan di &ldquo;Voucher saya&rdquo;</Label>
              <span className="text-caption text-muted-foreground">
                Voucher non-publik hanya bisa dipakai bila pelanggan tahu kodenya.
              </span>
            </div>
            <Switch
              id="v-public"
              checked={isPublic}
              onCheckedChange={(v) => setValue("isPublic", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="voucher-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
