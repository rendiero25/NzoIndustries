"use client";

import { MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ShippingTracking } from "@/lib/shipping/provider";
import { cancelMyOrder, confirmReceived, trackMyShipment } from "@/server/actions/account/orders";

const time = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Batalkan pesanan belum bayar (AlertDialog, design-system §9). */
export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="destructive-ghost" onClick={() => setOpen(true)}>
        Batalkan pesanan
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Batalkan pesanan ini?"
        description="Stok yang ditahan akan dilepas dan link pembayaran tidak bisa dipakai lagi."
        confirmLabel="Ya, batalkan"
        cancelLabel="Kembali"
        variant="destructive"
        isLoading={pending}
        onConfirm={() =>
          start(async () => {
            const res = await cancelMyOrder({ orderNumber });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Pesanan dibatalkan");
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}

/** Pembeli mengonfirmasi pesanan sudah diterima. */
export function ConfirmReceivedButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button onClick={() => setOpen(true)}>Pesanan diterima</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Pesanan sudah diterima?"
        description="Pastikan semua barang sudah kamu terima dan sesuai. Setelah ini pesanan dianggap selesai."
        confirmLabel="Ya, sudah diterima"
        isLoading={pending}
        onConfirm={() =>
          start(async () => {
            const res = await confirmReceived({ orderNumber });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Terima kasih! Pesanan selesai.");
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}

/** Riwayat pelacakan resi (dimuat saat diminta). */
export function TrackingPanel({ orderNumber }: { orderNumber: string }) {
  const [data, setData] = useState<ShippingTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load() {
    start(async () => {
      const res = await trackMyShipment({ orderNumber });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setData(res.tracking);
    });
  }

  if (!data) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button variant="outline" size="sm" onClick={load} disabled={pending}>
          {pending ? <Spinner className="size-4" /> : <MapPinned className="size-4" />}
          Lacak paket
        </Button>
        {error ? <p className="text-caption text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3 border-l border-border pl-4">
      {data.events.length === 0 ? (
        <li className="text-sm text-muted-foreground">Belum ada riwayat dari kurir.</li>
      ) : (
        data.events.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative text-sm">
            <span
              className={`absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-steel-200"}`}
              aria-hidden
            />
            <p className={i === 0 ? "font-medium" : "text-muted-foreground"}>{e.note}</p>
            {e.at ? (
              <p className="text-caption text-muted-foreground">
                {time.format(new Date(e.at))} WIB
              </p>
            ) : null}
          </li>
        ))
      )}
    </ol>
  );
}
