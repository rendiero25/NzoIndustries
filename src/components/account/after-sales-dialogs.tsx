"use client";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { RETURN_REASONS } from "@/lib/validations/account";
import { requestReturn, submitWarrantyClaim } from "@/server/actions/account/after-sales";

import { MediaUploader } from "./media-uploader";

type ItemOption = { id: string; name: string };

const ALL_ITEMS = "__all__";

/** Ajukan retur pesanan (D-36: dalam jendela retur sejak diterima). */
export function ReturnDialog({
  orderNumber,
  items,
  deadline,
}: {
  orderNumber: string;
  items: ItemOption[];
  deadline: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState(ALL_ITEMS);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function submit() {
    if (!reason) {
      toast.error("Pilih alasan retur.");
      return;
    }
    start(async () => {
      const res = await requestReturn({
        orderNumber,
        orderItemId: itemId === ALL_ITEMS ? null : itemId,
        reason: reason as (typeof RETURN_REASONS)[number],
        description: description.trim() || undefined,
        mediaPaths: paths,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pengajuan retur terkirim", { description: "Tim kami akan menghubungimu." });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Ajukan retur</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajukan retur</DialogTitle>
          <DialogDescription>
            {deadline ? `Bisa diajukan sampai ${deadline}. ` : ""}Sertakan foto agar lebih cepat
            diproses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Produk</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ITEMS}>Semua produk di pesanan ini</SelectItem>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Alasan</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Pilih alasan" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="return-desc">Keterangan (opsional)</Label>
            <Textarea
              id="return-desc"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <MediaUploader
            bucket="after-sales-media"
            max={6}
            onChange={setPaths}
            label="Foto / video"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Spinner className="size-4" /> : null}
            Kirim pengajuan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Klaim garansi satu item pesanan yang sudah diterima. */
export function ClaimDialog({
  orderItemId,
  productName,
}: {
  orderItemId: string;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function submit() {
    if (description.trim().length < 10) {
      toast.error("Jelaskan masalahnya minimal 10 karakter.");
      return;
    }
    start(async () => {
      const res = await submitWarrantyClaim({
        orderItemId,
        description: description.trim(),
        mediaPaths: paths,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Klaim garansi terkirim");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Klaim garansi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Klaim garansi</DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="claim-desc">Jelaskan masalahnya</Label>
            <Textarea
              id="claim-desc"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kapan mulai bermasalah, gejalanya, kendaraan yang dipakai…"
            />
          </div>
          <MediaUploader
            bucket="after-sales-media"
            max={6}
            onChange={setPaths}
            label="Foto / video"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Spinner className="size-4" /> : null}
            Kirim klaim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
