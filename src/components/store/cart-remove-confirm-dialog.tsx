"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CartRemoveConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: () => void;
  isLoading?: boolean;
};

/** Konfirmasi hapus item keranjang — selaras design.mdc (utility card, pill CTA, tipografi 17px). */
export function CartRemoveConfirmDialog({
  open,
  onOpenChange,
  productName,
  onConfirm,
  isLoading = false,
}: CartRemoveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-[18px] border border-border bg-white p-0 shadow-none sm:max-w-[400px]"
      >
        <DialogHeader className="space-y-2 px-6 py-5 text-left">
          <DialogTitle className="text-[21px] leading-[1.19] font-semibold tracking-[0.231px] text-foreground">
            Hapus dari keranjang?
          </DialogTitle>
          <DialogDescription className="text-base leading-[1.47] font-normal text-muted-foreground">
            <span className="font-medium text-foreground">{productName}</span>{" "}
            <span className="font-medium text-foreground">akan dihapus dari keranjang Anda.</span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="!flex flex-row !items-center justify-end gap-2 px-6">
          <Button
            type="button"
            variant="secondary"
            className="mb-4 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="destructive"
            className="mb-4 w-full text-white sm:w-auto"
            onClick={onConfirm}
            loading={isLoading}
          >
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
