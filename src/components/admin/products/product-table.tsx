"use client";

import { Copy, Percent } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/account/status-badge";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/money";
import type { StatusTone } from "@/lib/orders/status";
import { bulkProducts, duplicateProduct } from "@/server/actions/admin/products";
import type { AdminProductRow } from "@/server/queries/admin/products";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  published: { label: "Tayang", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  archived: { label: "Arsip", tone: "warning" },
};

type Option = { id: string; name: string; depth?: number };

/** Tabel produk admin dengan pilih baris + bulk action (publish, diskon D-38, brand, kategori). */
export function ProductTable({
  rows,
  brands,
  categories,
  lowThreshold,
}: {
  rows: AdminProductRow[];
  brands: Option[];
  categories: Option[];
  lowThreshold: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [discountOpen, setDiscountOpen] = useState(false);
  const [mode, setMode] = useState<"percent" | "amount" | "clear">("percent");
  const [value, setValue] = useState("10");
  const [scope, setScope] = useState<"selected" | "category">("selected");
  const [categoryId, setCategoryId] = useState<string>("");

  const ids = [...selected];
  const all = rows.length > 0 && selected.size === rows.length;

  const run = (input: Parameters<typeof bulkProducts>[0], done?: () => void) =>
    start(async () => {
      const res = await bulkProducts(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.affected} produk diperbarui`);
      setSelected(new Set());
      done?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-border bg-steel-50 px-3 py-2 text-sm">
        <span className="mr-1 font-medium">
          {selected.size ? `${selected.size} dipilih` : "Aksi massal"}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={!ids.length || pending}
          onClick={() => run({ action: "publish", ids })}
        >
          Tayangkan
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!ids.length || pending}
          onClick={() => run({ action: "draft", ids })}
        >
          Jadikan draft
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!ids.length || pending}
          onClick={() => run({ action: "archive", ids })}
        >
          Arsipkan
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setScope(ids.length ? "selected" : "category");
            setDiscountOpen(true);
          }}
        >
          <Percent className="size-4" /> Diskon / harga coret
        </Button>
        <Select
          disabled={!ids.length || pending}
          onValueChange={(b) => run({ action: "brand", ids, brandId: b === "none" ? null : b })}
        >
          <SelectTrigger size="sm" className="h-8 w-40">
            <SelectValue placeholder="Set brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Tanpa brand</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          disabled={!ids.length || pending}
          onValueChange={(c) => run({ action: "category", ids, categoryId: c })}
        >
          <SelectTrigger size="sm" className="h-8 w-48">
            <SelectValue placeholder="Tambah kategori" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {"— ".repeat(c.depth ?? 0)}
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pending ? <Spinner className="size-4" /> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={all}
                  onCheckedChange={(c) =>
                    setSelected(c ? new Set(rows.map((r) => r.id)) : new Set())
                  }
                  aria-label="Pilih semua di halaman ini"
                />
              </TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Tidak ada produk.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const st = STATUS[p.status] ?? { label: p.status, tone: "neutral" as const };
                return (
                  <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={(c) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (c) n.add(p.id);
                            else n.delete(p.id);
                            return n;
                          })
                        }
                        aria-label={`Pilih ${p.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-steel-50">
                          <ProductImage publicId={p.imagePublicId} alt={p.name} sizes="40px" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="line-clamp-1 font-medium hover:underline"
                          >
                            {p.name}
                          </Link>
                          <div className="text-caption text-muted-foreground">
                            <span className="font-mono">{p.sku}</span>
                            {p.brand ? ` · ${p.brand}` : ""}
                            {p.variantCount ? ` · ${p.variantCount} varian` : ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={st.label} tone={st.tone} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIDR(p.price)}
                      {p.compareAtPrice ? (
                        <div className="text-caption text-muted-foreground line-through">
                          {formatIDR(p.compareAtPrice)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${p.stock <= 0 ? "text-danger" : p.stock <= lowThreshold ? "text-warning" : ""}`}
                    >
                      {p.stock}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Duplikat ${p.name}`}
                        title="Duplikat"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await duplicateProduct(p.id);
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            toast.success("Produk diduplikat sebagai draft");
                            router.push(`/admin/products/${res.id}`);
                          })
                        }
                      >
                        <Copy className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Diskon / harga coret</DialogTitle>
            <DialogDescription>
              Harga normal disimpan sebagai harga coret, harga jual diturunkan. Berlaku juga untuk
              varian yang punya harga sendiri.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Sasaran</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as "selected" | "category")}
                className="gap-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="selected" disabled={!ids.length} /> {ids.length} produk
                  dipilih
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="category" /> Semua produk di satu kategori (termasuk
                  subkategori)
                </label>
              </RadioGroup>
              {scope === "category" ? (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {"— ".repeat(c.depth ?? 0)}
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>Jenis</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as typeof mode)}
                className="gap-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="percent" /> Persen
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="amount" /> Potongan rupiah
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="clear" /> Hapus diskon (kembali ke harga normal)
                </label>
              </RadioGroup>
              {mode !== "clear" ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  aria-label={mode === "percent" ? "Persen diskon" : "Potongan rupiah"}
                />
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={pending || (scope === "category" && !categoryId)}
              onClick={() =>
                run(
                  {
                    action: "discount",
                    ids: scope === "selected" ? ids : [],
                    categoryId: scope === "category" ? categoryId : null,
                    mode,
                    value: mode === "clear" ? 0 : Number(value) || 0,
                  },
                  () => setDiscountOpen(false),
                )
              }
            >
              {pending ? <Spinner className="size-4" /> : null}
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
