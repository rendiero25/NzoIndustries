"use client";

import { CreditCard, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { payOrder, refreshPaymentStatus } from "@/server/actions/payment";

/**
 * Tombol bayar & cek status untuk pesanan `pending_payment`. Saat halaman
 * dibuka (mis. kembali dari Mayar) status dicek sekali ke provider, jadi
 * pesanan yang sudah dibayar langsung tampil lunas walau webhook belum tiba.
 */
export function PaymentActions({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [paying, startPay] = useTransition();
  const [checking, startCheck] = useTransition();
  const autoChecked = useRef(false);

  useEffect(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;
    void refreshPaymentStatus({ orderNumber }).then((res) => {
      if (res.ok && res.status !== "pending_payment") router.refresh();
    });
  }, [orderNumber, router]);

  function pay() {
    startPay(async () => {
      const res = await payOrder({ orderNumber });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.location.assign(res.checkoutUrl);
    });
  }

  function check() {
    startCheck(async () => {
      const res = await refreshPaymentStatus({ orderNumber });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.status !== "pending_payment") {
        toast.success("Status pesanan diperbarui");
        router.refresh();
      } else {
        toast.info(
          "Pembayaran belum kami terima. Jika sudah bayar, tunggu 1–2 menit lalu cek lagi.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button size="lg" onClick={pay} disabled={paying}>
        {paying ? <Spinner className="size-4" /> : <CreditCard className="size-4" />}
        Bayar sekarang
      </Button>
      <Button size="lg" variant="outline" onClick={check} disabled={checking}>
        {checking ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
        Cek status pembayaran
      </Button>
    </div>
  );
}
