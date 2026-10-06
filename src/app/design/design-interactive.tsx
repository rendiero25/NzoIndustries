"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function AddToCartIcon() {
  return (
    <Button
      type="button"
      size="icon-sm"
      aria-label="Tambah ke keranjang"
      onClick={() => toast.success("Ditambahkan ke keranjang")}
    >
      <Plus strokeWidth={2} />
    </Button>
  );
}

export function DesignInteractive() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState("14");

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-email">Email</Label>
          <Input id="demo-email" type="email" placeholder="nama@email.com" className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="demo-error">Jumlah</Label>
          <Input id="demo-error" aria-invalid defaultValue="12" className="h-11" />
          <p role="alert" className="text-sm text-destructive">
            Stok tersisa 2. Kurangi jumlah pesanan.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox defaultChecked /> Simpan alamat ini
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch defaultChecked /> Kirim notifikasi pesanan
        </label>
        <RadioGroup defaultValue="mayar" className="gap-3">
          <label className="flex items-center gap-3 text-sm">
            <RadioGroupItem value="mayar" /> Bayar lewat Mayar
          </label>
          <label className="flex items-center gap-3 text-sm">
            <RadioGroupItem value="transfer" /> Transfer manual
          </label>
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Varian (ToggleGroup)</p>
          <ToggleGroup
            type="single"
            variant="outline"
            value={variant}
            onValueChange={(v) => v && setVariant(v)}
          >
            {["14", "18", "22"].map((size) => (
              <ToggleGroupItem key={size} value={size} aria-label={`${size} inci`}>
                {size}&quot;
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toast.success("Perubahan disimpan")}>
            Toast sukses
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.error("Gagal menyimpan. Periksa koneksi lalu coba lagi.")}
          >
            Toast error
          </Button>
          <Button variant="destructive-ghost" onClick={() => setOpen(true)}>
            Hapus produk
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus produk ini?"
        description="Produk dan semua variannya hilang dari katalog. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus produk"
        variant="destructive"
        onConfirm={() => {
          setOpen(false);
          toast.success("Produk dihapus");
        }}
      />
    </div>
  );
}
