"use client";

import { History, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adjustStock, getMovements } from "@/server/actions/admin/stock";
import type { MovementRow, StockRow } from "@/server/queries/admin/stock";

const TYPE_LABEL: Record<string, string> = {
  initial: "Stok awal",
  adjustment: "Penyesuaian",
  correction: "Koreksi",
  import: "Import",
  sale: "Penjualan",
  return: "Pengembalian",
};

const time = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function StockTable({
  rows,
  threshold,
  canManageProducts,
}: {
  rows: StockRow[];
  threshold: number;
  canManageProducts: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<StockRow | null>(null);
  const [mode, setMode] = useState<"add" | "subtract" | "set">("add");
  const [qty, setQty] = useState("");
  const [type, setType] = useState<"adjustment" | "correction" | "return">("adjustment");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<{ row: StockRow; items: MovementRow[] | null } | null>(
    null,
  );

  const openHistory = (row: StockRow) => {
    setHistory({ row, items: null });
    start(async () => {
      const res = await getMovements(row.productId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setHistory({ row, items: res.rows });
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Produk</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="text-right">Ditahan</TableHead>
              <TableHead className="text-right">Tersedia</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${r.productId}-${r.variantId ?? ""}`}>
                  <TableCell className="pl-4">
                    {canManageProducts ? (
                      <Link
                        href={`/admin/products/${r.productId}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.name}</span>
                    )}
                    {r.variantName ? (
                      <div className="text-caption text-muted-foreground">{r.variantName}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-caption">{r.sku}</TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${r.stock <= 0 ? "text-danger" : r.stock <= threshold ? "text-warning" : ""}`}
                  >
                    {r.stock}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {r.reserved || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.available}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Sesuaikan stok ${r.name}`}
                        title="Sesuaikan"
                        onClick={() => {
                          setTarget(r);
                          setQty("");
                          setReason("");
                          setMode("add");
                        }}
                      >
                        <SlidersHorizontal className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Riwayat stok ${r.name}`}
                        title="Riwayat"
                        onClick={() => openHistory(r)}
                      >
                        <History className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan stok</DialogTitle>
            <DialogDescription>
              {target?.name}
              {target?.variantName ? ` · ${target.variantName}` : ""} — stok sekarang{" "}
              {target?.stock}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as typeof mode)}
              className="grid-cols-3"
            >
              {(
                [
                  ["add", "Tambah"],
                  ["subtract", "Kurangi"],
                  ["set", "Jadikan"],
                ] as const
              ).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={v} /> {l}
                </label>
              ))}
            </RadioGroup>
            <div className="grid gap-2">
              <Label htmlFor="adj-qty">Jumlah</Label>
              <Input
                id="adj-qty"
                type="number"
                min={0}
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adj-type">Jenis</Label>
              <select
                id="adj-type"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="adjustment">Penyesuaian (stok opname, barang masuk)</option>
                <option value="correction">Koreksi kesalahan input</option>
                <option value="return">Pengembalian barang</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adj-reason">Alasan</Label>
              <Input
                id="adj-reason"
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="mis. Barang masuk dari supplier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={pending || !qty || reason.trim().length < 3}
              onClick={() =>
                target &&
                start(async () => {
                  const res = await adjustStock({
                    productId: target.productId,
                    variantId: target.variantId,
                    mode,
                    quantity: Number(qty),
                    type,
                    reason: reason.trim(),
                  });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(`Stok jadi ${res.stock}`);
                  setTarget(null);
                  router.refresh();
                })
              }
            >
              {pending ? <Spinner className="size-4" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Riwayat stok</SheetTitle>
            <SheetDescription>{history?.row.name} · 100 mutasi terakhir</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {!history?.items ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-5" />
              </div>
            ) : history.items.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Belum ada mutasi.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {history.items.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {TYPE_LABEL[m.type] ?? m.type}
                        {m.variantName ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {m.variantName}
                          </span>
                        ) : null}
                      </p>
                      {m.reason ? <p className="text-muted-foreground">{m.reason}</p> : null}
                      <p className="text-caption text-muted-foreground">
                        {time.format(new Date(m.createdAt))} · {m.actor}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${m.quantity < 0 ? "text-danger" : "text-success"}`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
