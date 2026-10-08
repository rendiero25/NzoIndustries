"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { simulateTestPayment } from "@/server/actions/payment";

/** Tombol simulator (D-32): hasil "berhasil" dilunasi lewat settlePayment. */
export function PaymentSimulator({
  paymentRef,
  orderNumber,
}: {
  paymentRef: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const back = `/checkout/success?order=${encodeURIComponent(orderNumber)}`;

  function run(result: "paid" | "cancel") {
    start(async () => {
      const res = await simulateTestPayment({ ref: paymentRef, result });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.replace(back);
    });
  }

  return (
    <div className="grid gap-2">
      <Button size="lg" onClick={() => run("paid")} disabled={pending}>
        {pending ? <Spinner className="size-4" /> : null}
        Simulasikan bayar berhasil
      </Button>
      <Button size="lg" variant="outline" onClick={() => run("cancel")} disabled={pending}>
        Batalkan, kembali ke toko
      </Button>
    </div>
  );
}
