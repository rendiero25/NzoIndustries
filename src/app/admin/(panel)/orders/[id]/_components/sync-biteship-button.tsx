"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncBiteshipAWB } from "../../_actions";

interface SyncBiteshipButtonProps {
  orderId: string;
}

export function SyncBiteshipButton({ orderId }: SyncBiteshipButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncBiteshipAWB(orderId);
      if (result.error) {
        toast.error(`Sync gagal: ${result.error}`);
      } else {
        toast.success(
          result.awb
            ? `Disinkronisasi. AWB: ${result.awb}. Status: ${result.status ?? "-"}`
            : `Disinkronisasi. Status: ${result.status ?? "-"}. AWB belum tersedia.`,
        );
      }
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-full"
      onClick={handleSync}
      disabled={isPending}
    >
      <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Menyinkronisasi..." : "Sinkronisasi dari Biteship"}
    </Button>
  );
}
