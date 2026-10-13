"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Pencil, Plus, Search, Trash2, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { Spinner } from "@/components/ui/spinner";
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
import { saleState } from "@/lib/promo/status";
import { flashSaleSchema, toWibInput, type FlashSaleValues } from "@/lib/validations/admin-promo";
import {
  deleteFlashSale,
  deleteFlashSaleItem,
  saveFlashSale,
  saveFlashSaleItem,
  searchFlashSaleProducts,
} from "@/server/actions/admin/promo";
import type { AdminFlashSale, AdminFlashSaleItem, ProductPick } from "@/server/queries/admin/promo";

const dt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// ---------------------------------------------------------------- daftar event

export function FlashSaleList({ sales, now }: { sales: AdminFlashSale[]; now: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminFlashSale | null>(null);
  const [pending, start] = useTransition();

  const confirmDelete = () => {
    if (!deleting) return;
    start(async () => {
      const res = await deleteFlashSale(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Flash sale dihapus.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Buat flash sale
        </Button>
      </div>
      {sales.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Belum ada flash sale"
          description="Buat event, lalu tambahkan produk dengan harga khusus."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Periode (WIB)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Produk</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const state = saleState(s, now);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/admin/flash-sales/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                      {s.subtitle ? (
                        <span className="block text-caption text-muted-foreground">
                          {s.subtitle}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {dt.format(new Date(s.startsAt))} – {dt.format(new Date(s.endsAt))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.itemCount}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Kelola ${s.name}`}
                        >
                          <Link href={`/admin/flash-sales/${s.id}`}>
                            <ArrowRight />
                          </Link>
                        </Button>
                        <Button
                          variant="destructive-ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${s.name}`}
                          onClick={() => setDeleting(s)}
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

      <FlashSaleDialog
        open={creating}
        sale={null}
        onClose={() => setCreating(false)}
        onSaved={(id) => router.push(`/admin/flash-sales/${id}`)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus flash sale "${deleting?.name ?? ""}"?`}
        description="Semua item ikut terhapus. Flash sale yang sudah ada penjualan tidak bisa dihapus; nonaktifkan saja."
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------- form event

export function FlashSaleDialog({
  open,
  sale,
  onClose,
  onSaved,
}: {
  open: boolean;
  sale: AdminFlashSale | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [pending, start] = useTransition();
  const defaults = (): FlashSaleValues =>
    sale
      ? {
          name: sale.name,
          subtitle: sale.subtitle ?? "",
          startsAt: toWibInput(sale.startsAt),
          endsAt: toWibInput(sale.endsAt),
          isActive: sale.isActive,
        }
      : { name: "", subtitle: "", startsAt: "", endsAt: "", isActive: true };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FlashSaleValues>({
    resolver: zodResolver(flashSaleSchema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isActive = useWatch({ control, name: "isActive" });

  const onSubmit = (values: FlashSaleValues) =>
    start(async () => {
      const res = await saveFlashSale(sale?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(sale ? "Flash sale disimpan." : "Flash sale dibuat. Tambahkan produk.");
      onClose();
      onSaved(res.id);
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sale ? "Ubah flash sale" : "Buat flash sale"}</DialogTitle>
          <DialogDescription>Tampil di beranda saat berjalan. Waktu dalam WIB.</DialogDescription>
        </DialogHeader>
        <form
          id="sale-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fs-name">Nama</Label>
            <Input id="fs-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-sm text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fs-sub">Subjudul (opsional)</Label>
            <Input id="fs-sub" {...register("subtitle")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fs-start">Mulai</Label>
              <Input
                id="fs-start"
                type="datetime-local"
                aria-invalid={!!errors.startsAt}
                {...register("startsAt")}
              />
              {errors.startsAt ? (
                <p className="text-sm text-danger">{errors.startsAt.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fs-end">Selesai</Label>
              <Input
                id="fs-end"
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
            <Label htmlFor="fs-active">Aktif</Label>
            <Switch
              id="fs-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="sale-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditFlashSaleButton({ sale }: { sale: AdminFlashSale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Ubah event
      </Button>
      <FlashSaleDialog
        open={open}
        sale={sale}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

// ---------------------------------------------------------------- item

type Target =
  | { mode: "add"; product: ProductPick; variantId: string | null }
  | { mode: "edit"; item: AdminFlashSaleItem };

export function FlashSaleItems({
  flashSaleId,
  items,
}: {
  flashSaleId: string;
  items: AdminFlashSaleItem[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductPick[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [target, setTarget] = useState<Target | null>(null);
  const [price, setPrice] = useState("");
  const [quota, setQuota] = useState("");
  const [removing, setRemoving] = useState<AdminFlashSaleItem | null>(null);
  const [pending, start] = useTransition();

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    startSearch(async () => {
      const res = await searchFlashSaleProducts(q);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResults(res.items);
    });
  };

  const openAdd = (product: ProductPick, variantId: string | null) => {
    setTarget({ mode: "add", product, variantId });
    setPrice("");
    setQuota("");
  };
  const openEdit = (item: AdminFlashSaleItem) => {
    setTarget({ mode: "edit", item });
    setPrice(String(item.salePrice));
    setQuota(item.quota === null ? "" : String(item.quota));
  };

  const normalPrice =
    target?.mode === "edit"
      ? target.item.normalPrice
      : target
        ? (target.product.variants.find((v) => v.id === target.variantId)?.price ??
          target.product.price)
        : 0;

  const submit = () => {
    if (!target) return;
    start(async () => {
      const res = await saveFlashSaleItem(target.mode === "edit" ? target.item.id : null, {
        flashSaleId,
        productId: target.mode === "edit" ? target.item.productId : target.product.id,
        variantId: target.mode === "edit" ? target.item.variantId : target.variantId,
        salePrice: price,
        quota,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(target.mode === "edit" ? "Item disimpan." : "Produk ditambahkan.");
      setTarget(null);
      router.refresh();
    });
  };

  const confirmRemove = () => {
    if (!removing) return;
    start(async () => {
      const res = await deleteFlashSaleItem(flashSaleId, removing.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Item dihapus.");
      setRemoving(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="fs-add">
        <h2 id="fs-add" className="text-base font-semibold">
          Tambah produk
        </h2>
        <form onSubmit={search} className="flex max-w-lg gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama atau SKU"
              aria-label="Cari produk"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={searching || q.trim().length < 2}>
            {searching ? <Spinner /> : "Cari"}
          </Button>
        </form>
        {results ? (
          results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok.</p>
          ) : (
            <ul className="flex max-w-3xl flex-col divide-y divide-border rounded-lg border border-border">
              {results.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="line-clamp-1 text-sm font-medium">{p.name}</span>
                      <span className="font-mono text-caption text-muted-foreground">
                        {p.sku} · {formatIDR(p.price)} · stok {p.stock}
                        {p.status !== "published" ? " · draft" : ""}
                      </span>
                    </div>
                    {p.variants.length === 0 ? (
                      <Button size="sm" variant="outline" onClick={() => openAdd(p, null)}>
                        <Plus /> Tambah
                      </Button>
                    ) : null}
                  </div>
                  {p.variants.length ? (
                    <div className="flex flex-wrap gap-2">
                      {p.variants.map((v) => (
                        <Button
                          key={v.id}
                          size="sm"
                          variant="outline"
                          onClick={() => openAdd(p, v.id)}
                        >
                          <Plus /> {v.name} · {formatIDR(v.price ?? p.price)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="fs-items">
        <h2 id="fs-items" className="text-base font-semibold">
          Produk di flash sale ({items.length})
        </h2>
        {items.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Belum ada produk"
            description="Cari produk di atas lalu atur harga flash sale."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Normal</TableHead>
                  <TableHead className="text-right">Flash sale</TableHead>
                  <TableHead className="text-right">Terjual / kuota</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <span className="line-clamp-1 font-medium">{i.productName}</span>
                      <span className="font-mono text-caption text-muted-foreground">
                        {i.sku}
                        {i.variantName ? ` · ${i.variantName}` : ""}
                      </span>
                      {i.status !== "published" ? (
                        <Badge variant="outline" className="ml-2">
                          Tidak tayang
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground tabular-nums line-through">
                      {formatIDR(i.normalPrice)}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatIDR(i.salePrice)}
                      {i.normalPrice > 0 ? (
                        <span className="block text-caption font-normal text-muted-foreground">
                          −{Math.round((1 - i.salePrice / i.normalPrice) * 100)}%
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.sold} / {i.quota ?? "∞"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.stock}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ubah ${i.productName}`}
                          onClick={() => openEdit(i)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="destructive-ghost"
                          size="icon-sm"
                          aria-label={`Hapus ${i.productName}`}
                          onClick={() => setRemoving(i)}
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
      </section>

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{target?.mode === "edit" ? "Ubah item" : "Harga flash sale"}</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {target?.mode === "edit" ? target.item.productName : target?.product.name} · harga
              normal {formatIDR(normalPrice)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fi-price">Harga flash sale (Rp)</Label>
              <Input
                id="fi-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              />
              {price && Number(price) < normalPrice ? (
                <span className="text-caption text-muted-foreground">
                  Diskon {Math.round((1 - Number(price) / normalPrice) * 100)}%
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fi-quota">Kuota (opsional)</Label>
              <Input
                id="fi-quota"
                inputMode="numeric"
                placeholder="Tanpa batas (dibatasi stok)"
                value={quota}
                onChange={(e) => setQuota(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending || !price}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Hapus produk dari flash sale?"
        description={removing?.productName}
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
