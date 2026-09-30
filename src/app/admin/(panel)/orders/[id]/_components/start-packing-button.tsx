"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "../../_actions";

interface StartPackingButtonProps {
  orderId: string;
}

export function StartPackingButton({ orderId }: StartPackingButtonProps) {
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
          const result = await updateOrderStatus(orderId, "processing");
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Pesanan mulai dikemas.");
          }
        });
      }}
    >
      <Package size={13} />
      {isPending ? "Memproses..." : "Mulai Kemas"}
    </Button>
  );
}
