"use client";

import { PackageCheck, RotateCcw, Truck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { createCourierShipment, setOrderStatus } from "@/server/actions/admin/orders";

type Target =
  "processing" | "shipped" | "delivered" | "completed" | "cancelled" | "refunded" | "paid";

/** Aksi status pesanan admin; transisi tetap divalidasi RPC di DB. */
export function AdminOrderActions({
  orderNumber,
  status,
  courierCode,
  canManage,
  canShip,
  paidAfterCancel,
}: {
  orderNumber: string;
  status: string;
  courierCode: string | null;
  /** owner/admin: refund & aktifkan ulang. */
  canManage: boolean;
  /** owner/admin/warehouse: ubah status. */
  canShip: boolean;
  paidAfterCancel: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<Target | null>(null);
  const [reasonFor, setReasonFor] = useState<"cancelled" | "refunded" | null>(null);
  const [reason, setReason] = useState("");
  const [shipOpen, setShipOpen] = useState(false);
  const [courier, setCourier] = useState(courierCode ?? "");
  const [waybill, setWaybill] = useState("");

  const run = (to: Target, extra: { note?: string; courierCode?: string; waybill?: string } = {}) =>
    start(async () => {
      const res = await setOrderStatus({ orderNumber, to, ...extra });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Status pesanan diperbarui");
      setConfirm(null);
      setReasonFor(null);
      setShipOpen(false);
      setReason("");
      router.refresh();
    });

  if (!canShip)
    return <p className="text-sm text-muted-foreground">Kamu hanya bisa melihat pesanan.</p>;

  const CONFIRM_TEXT: Partial<
    Record<Target, { title: string; description: string; label: string }>
  > = {
    processing: {
      title: "Proses pesanan ini?",
      description: "Status jadi Diproses. Pelanggan mendapat notifikasi.",
      label: "Proses",
    },
    delivered: {
      title: "Tandai sudah sampai?",
      description: "Pelanggan diminta mengonfirmasi penerimaan.",
      label: "Tandai sampai",
    },
    completed: {
      title: "Selesaikan pesanan?",
      description: "Pesanan dianggap selesai.",
      label: "Selesaikan",
    },
    paid: {
      title: "Aktifkan ulang pesanan?",
      description:
        "Pembayaran sudah masuk setelah pesanan batal/kedaluwarsa. Stok akan diambil sekarang (gagal bila tidak cukup).",
      label: "Aktifkan ulang",
    },
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "paid" ? (
        <Button onClick={() => setConfirm("processing")} disabled={pending}>
          <PackageCheck className="size-4" /> Proses pesanan
        </Button>
      ) : null}
      {status === "paid" || status === "processing" ? (
        <Button
          variant={status === "processing" ? "primary" : "outline"}
          onClick={() => setShipOpen(true)}
          disabled={pending}
        >
          <Truck className="size-4" /> Kirim (input resi)
        </Button>
      ) : null}
      {status === "shipped" ? (
        <Button onClick={() => setConfirm("delivered")} disabled={pending}>
          Tandai sampai
        </Button>
      ) : null}
      {status === "delivered" ? (
        <Button onClick={() => setConfirm("completed")} disabled={pending}>
          Selesaikan
        </Button>
      ) : null}
      {status === "pending_payment" ? (
        <Button
          variant="destructive-ghost"
          onClick={() => setReasonFor("cancelled")}
          disabled={pending}
        >
          <XCircle className="size-4" /> Batalkan
        </Button>
      ) : null}
      {canManage && (status === "paid" || status === "processing") ? (
        <Button
          variant="destructive-ghost"
          onClick={() => setReasonFor("refunded")}
          disabled={pending}
        >
          <RotateCcw className="size-4" /> Batalkan & refund
        </Button>
      ) : null}
      {canManage && paidAfterCancel ? (
        <>
          <Button onClick={() => setConfirm("paid")} disabled={pending}>
            Aktifkan ulang
          </Button>
          <Button variant="destructive-ghost" onClick={() => setReasonFor("refunded")} disabled>
            Refund manual di Mayar
          </Button>
        </>
      ) : null}

      {confirm && CONFIRM_TEXT[confirm] ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={CONFIRM_TEXT[confirm]!.title}
          description={CONFIRM_TEXT[confirm]!.description}
          confirmLabel={CONFIRM_TEXT[confirm]!.label}
          isLoading={pending}
          onConfirm={() => run(confirm)}
        />
      ) : null}

      <Dialog open={!!reasonFor} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonFor === "refunded" ? "Batalkan & refund pesanan" : "Batalkan pesanan"}
            </DialogTitle>
            <DialogDescription>
              {reasonFor === "refunded"
                ? "Stok dikembalikan. Kembalikan dana pelanggan secara manual lewat dashboard Mayar."
                : "Stok yang ditahan dilepas dan link pembayaran tidak bisa dipakai lagi."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="cancel-reason">Alasan (dikirim ke pelanggan)</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonFor(null)}>
              Kembali
            </Button>
            <Button
              variant="destructive"
              disabled={pending || reason.trim().length < 3}
              onClick={() => reasonFor && run(reasonFor, { note: reason.trim() })}
            >
              {pending ? <Spinner className="size-4" /> : null}
              {reasonFor === "refunded" ? "Batalkan & refund" : "Batalkan pesanan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim pesanan</DialogTitle>
            <DialogDescription>
              Isi nomor resi dari kurir. Pelanggan mendapat notifikasi dan bisa melacak paket.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ship-courier">Kode kurir</Label>
              <Input
                id="ship-courier"
                value={courier}
                onChange={(e) => setCourier(e.target.value.toLowerCase())}
                placeholder="jne, jnt, sicepat…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ship-waybill">Nomor resi</Label>
              <Input
                id="ship-waybill"
                value={waybill}
                onChange={(e) => setWaybill(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await createCourierShipment({ orderNumber });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(`Pengiriman dibuat, resi ${res.waybill}`);
                  setShipOpen(false);
                  router.refresh();
                })
              }
            >
              Buat lewat Biteship
            </Button>
            <Button
              disabled={pending || waybill.trim().length < 5}
              onClick={() =>
                run("shipped", {
                  courierCode: courier.trim() || undefined,
                  waybill: waybill.trim(),
                })
              }
            >
              {pending ? <Spinner className="size-4" /> : null}
              Simpan & kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
