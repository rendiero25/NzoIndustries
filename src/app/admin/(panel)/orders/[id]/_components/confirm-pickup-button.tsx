"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmReadyForPickup } from "../../_actions";

interface ConfirmPickupButtonProps {
  orderId: string;
}

export function ConfirmPickupButton({ orderId }: ConfirmPickupButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await confirmReadyForPickup(orderId);
          if (result.error) {
            toast.error(result.error);
          } else if (result.awb) {
            toast.success(`Paket dikonfirmasi siap pickup. Nomor resi: ${result.awb}`);
          } else {
            toast.success(
              "Paket dikonfirmasi siap pickup. Nomor resi belum terbit dari Biteship, gunakan tombol sinkron.",
            );
          }
        });
      }}
    >
      <PackageCheck size={13} />
      {isPending ? "Mengonfirmasi..." : "Konfirmasi Siap Pickup"}
    </Button>
  );
}
