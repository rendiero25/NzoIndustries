"use client";

import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addFitment,
  saveSpecs,
  saveVariants,
  updateFitment,
} from "@/server/actions/admin/products";
import type { AdminProductDetail } from "@/server/queries/admin/products";

type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  weightGrams: string;
  isActive: boolean;
  stock?: number;
  initialStock: string;
};

const toStr = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

/** Editor varian: harga/berat per varian; stok varian baru lewat stok awal, sesudahnya lewat penyesuaian stok. */
export function VariantsEditor({ product }: { product: AdminProductDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<VariantRow[]>(
    product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: toStr(v.price),
      compareAtPrice: toStr(v.compareAtPrice),
      weightGrams: toStr(v.weightGrams),
      isActive: v.isActive,
      stock: v.stock,
      initialStock: "",
    })),
  );
  const patch = (i: number, p: Partial<VariantRow>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Varian</CardTitle>
        <CardDescription>
          Harga varian kosong = ikut harga produk. Varian yang dihapus dari daftar dinonaktifkan
          (riwayat stok & pesanan tetap).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Produk ini tanpa varian.</p>
        ) : null}
        <div className="overflow-x-auto">
          {rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Harga coret</TableHead>
                  <TableHead>Berat (g)</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.id ?? `new-${i}`}>
                    <TableCell className="min-w-36">
                      <Input
                        value={r.name}
                        onChange={(e) => patch(i, { name: e.target.value })}
                        aria-label="Nama varian"
                      />
                    </TableCell>
                    <TableCell className="min-w-36">
                      <Input
                        value={r.sku}
                        className="font-mono"
                        onChange={(e) => patch(i, { sku: e.target.value })}
                        aria-label="SKU varian"
                      />
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Input
                        type="number"
                        value={r.price}
                        onChange={(e) => patch(i, { price: e.target.value })}
                        aria-label="Harga varian"
                      />
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Input
                        type="number"
                        value={r.compareAtPrice}
                        onChange={(e) => patch(i, { compareAtPrice: e.target.value })}
                        aria-label="Harga coret varian"
                      />
                    </TableCell>
                    <TableCell className="min-w-24">
                      <Input
                        type="number"
                        value={r.weightGrams}
                        onChange={(e) => patch(i, { weightGrams: e.target.value })}
                        aria-label="Berat varian"
                      />
                    </TableCell>
                    <TableCell className="min-w-24">
                      {r.id ? (
                        <span className="tabular-nums">{r.stock}</span>
                      ) : (
                        <Input
                          type="number"
                          placeholder="Awal"
                          value={r.initialStock}
                          onChange={(e) => patch(i, { initialStock: e.target.value })}
                          aria-label="Stok awal varian"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={r.isActive}
                        onCheckedChange={(v) => patch(i, { isActive: v === true })}
                        aria-label="Varian aktif"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="destructive-ghost"
                        aria-label="Hapus varian"
                        onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((r) => [
                ...r,
                {
                  name: "",
                  sku: `${product.sku}-${r.length + 1}`,
                  price: "",
                  compareAtPrice: "",
                  weightGrams: "",
                  isActive: true,
                  initialStock: "",
                },
              ])
            }
          >
            <Plus className="size-4" /> Tambah varian
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveVariants(
                  product.id,
                  rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    sku: r.sku,
                    price: r.price,
                    compareAtPrice: r.compareAtPrice,
                    weightGrams: r.weightGrams,
                    isActive: r.isActive,
                    initialStock: r.initialStock ? Number(r.initialStock) : undefined,
                  })),
                );
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Varian disimpan");
                router.refresh();
              })
            }
          >
            {pending ? <Spinner className="size-4" /> : null}
            Simpan varian
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Editor spesifikasi label–nilai (termasuk "Nomor part"). */
export function SpecsEditor({ product }: { product: AdminProductDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState(
    product.specs.length ? product.specs : [{ label: "", value: "" }],
  );
  const patch = (i: number, p: Partial<{ label: string; value: string }>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spesifikasi</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Label (mis. Nomor part)"
              value={r.label}
              onChange={(e) => patch(i, { label: e.target.value })}
              className="w-48"
              aria-label="Label spesifikasi"
            />
            <Input
              placeholder="Nilai"
              value={r.value}
              onChange={(e) => patch(i, { value: e.target.value })}
              aria-label="Nilai spesifikasi"
            />
            <Button
              size="icon"
              variant="destructive-ghost"
              aria-label="Hapus baris"
              onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows((r) => [...r, { label: "", value: "" }])}
          >
            <Plus className="size-4" /> Tambah baris
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveSpecs(
                  product.id,
                  rows.filter((r) => r.label.trim() && r.value.trim()),
                );
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Spesifikasi disimpan");
                router.refresh();
              })
            }
          >
            {pending ? <Spinner className="size-4" /> : null}
            Simpan spesifikasi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type Make = { id: string; name: string; type: string };
type Model = {
  id: string;
  makeId: string;
  name: string;
  yearStart: number;
  yearEnd: number | null;
};

/** Fitment: tambah (terverifikasi), konfirmasi saran import, hapus (D-27). */
export function FitmentsEditor({
  product,
  makes,
  models,
}: {
  product: AdminProductDetail;
  makes: Make[];
  models: Model[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const modelOptions = models.filter((m) => m.makeId === makeId);
  const selectClass =
    "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  const act = (id: string, action: "verify" | "remove") =>
    start(async () => {
      const res = await updateFitment({ id, productId: product.id, action });
      if (!res.ok) toast.error(res.error);
      else toast.success(action === "verify" ? "Fitment dikonfirmasi" : "Fitment dihapus");
      router.refresh();
    });

  const suggested = product.fitments.filter((f) => !f.isVerified);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kecocokan kendaraan</CardTitle>
        <CardDescription>
          Terverifikasi tampil dengan badge perisai &quot;Cocok&quot;. Saran dari nama produk
          (import) tampil sebagai &quot;Disebut untuk…&quot; sampai dikonfirmasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_6rem_auto] sm:items-end">
          <div className="grid gap-1">
            <Label htmlFor="fit-make">Merek</Label>
            <select
              id="fit-make"
              className={selectClass}
              value={makeId}
              onChange={(e) => {
                setMakeId(e.target.value);
                setModelId("");
              }}
            >
              <option value="">Pilih merek</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type === "car" ? "Mobil" : "Motor"})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="fit-model">Model</Label>
            <select
              id="fit-model"
              className={selectClass}
              value={modelId}
              disabled={!makeId}
              onChange={(e) => setModelId(e.target.value)}
            >
              <option value="">Pilih model</option>
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.yearStart}–{m.yearEnd ?? "kini"})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="fit-y1">Dari</Label>
            <Input
              id="fit-y1"
              type="number"
              placeholder="Semua"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="fit-y2">Sampai</Label>
            <Input
              id="fit-y2"
              type="number"
              placeholder="Semua"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
            />
          </div>
          <Button
            disabled={!modelId || pending}
            onClick={() =>
              start(async () => {
                const res = await addFitment(product.id, {
                  modelId,
                  yearStart: yearStart ? Number(yearStart) : null,
                  yearEnd: yearEnd ? Number(yearEnd) : null,
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Fitment ditambahkan");
                setModelId("");
                setYearStart("");
                setYearEnd("");
                router.refresh();
              })
            }
          >
            <Plus className="size-4" /> Tambah
          </Button>
        </div>

        {suggested.length > 0 ? (
          <div className="flex items-center justify-between rounded-lg bg-steel-50 px-3 py-2 text-sm">
            <span>{suggested.length} saran dari import belum dikonfirmasi.</span>
          </div>
        ) : null}

        {product.fitments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data kecocokan.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {product.fitments.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium">{f.label}</span>{" "}
                  <span className="text-muted-foreground">
                    {f.yearStart || f.yearEnd
                      ? `${f.yearStart ?? "…"}–${f.yearEnd ?? "…"}`
                      : "semua tahun"}
                  </span>
                </span>
                {f.isVerified ? (
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="size-3" /> Terverifikasi
                  </Badge>
                ) : (
                  <>
                    <Badge variant="secondary">Saran import</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => act(f.id, "verify")}
                    >
                      Konfirmasi
                    </Button>
                  </>
                )}
                <Button
                  size="icon-sm"
                  variant="destructive-ghost"
                  aria-label={`Hapus ${f.label}`}
                  disabled={pending}
                  onClick={() => act(f.id, "remove")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
