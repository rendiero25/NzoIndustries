"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";
import { updateOrderStatus } from "../../_actions";
import { VALID_TRANSITIONS, type OrderStatus } from "../../_constants";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

interface StatusUpdaterProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function StatusUpdater({ orderId, currentStatus }: StatusUpdaterProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const validNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const canUpdate = validNext.length > 0;

  const handleSubmit = () => {
    if (!selectedStatus) return;
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, selectedStatus, note);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Status diperbarui ke "${ADMIN_ORDER_STATUS_LABEL[selectedStatus]}".`);
        setOpen(false);
        setSelectedStatus("");
        setNote("");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status saat ini:</span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
            adminOrderStatusBadgeClass(currentStatus),
          )}
        >
          {ADMIN_ORDER_STATUS_LABEL[currentStatus]}
        </span>
      </div>

      {canUpdate ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          Ubah Status
        </Button>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Status ini tidak dapat diubah secara manual.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-lg border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase">
              Ubah Status Pesanan
            </DialogTitle>
            <DialogDescription className="text-base leading-[1.47]">
              Pilih status baru. Perubahan akan dicatat di riwayat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className={labelClass}>Status Baru</Label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-brand/30 focus:outline-none"
              >
                <option value="">— Pilih status —</option>
                {validNext.map((s) => (
                  <option key={s} value={s}>
                    {ADMIN_ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Catatan (opsional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Alasan perubahan status..."
                className="h-20 resize-none rounded-lg border-border text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                loading={isPending}
                disabled={!selectedStatus}
              >
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
