import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PaymentSimulator } from "@/components/storefront/payment-simulator";
import { getCurrentUser } from "@/lib/auth/guards";
import { formatIDR } from "@/lib/money";
import { isTestPaymentMode } from "@/lib/payments/provider";
import { TEST_REF_PREFIX } from "@/lib/payments/test-provider";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Simulator pembayaran", robots: { index: false } };

/**
 * Pengganti halaman Mayar selama MAYAR_API_KEY kosong dan PAYMENT_TEST_MODE=true
 * (D-32). Di luar mode uji halaman ini 404.
 */
export default async function PayTestPage({ params }: { params: Promise<{ ref: string }> }) {
  if (!isTestPaymentMode()) notFound();
  const { ref: rawRef } = await params;
  const ref = decodeURIComponent(rawRef);
  if (!ref.startsWith(TEST_REF_PREFIX) || ref.length > 80) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/checkout/pay-test/${rawRef}`)}`);

  const { data: payment } = await createAdminClient()
    .from("payments")
    .select("amount, status, order:orders(order_number, user_id)")
    .eq("provider_ref", ref)
    .maybeSingle();
  if (!payment || payment.order?.user_id !== user.id) notFound();

  return (
    <div className="nzo-container flex justify-center py-12 md:py-16">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-dashed border-border p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-steel-700">
          <FlaskConical className="size-4" strokeWidth={1.75} aria-hidden />
          Mode uji — bukan pembayaran sungguhan
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Simulator pembayaran</h1>
          <p className="text-sm text-muted-foreground">
            Pesanan <span className="font-mono">{payment.order.order_number}</span>
          </p>
        </div>
        <p className="text-3xl font-bold tabular-nums">{formatIDR(Number(payment.amount))}</p>
        {payment.status === "pending" ? (
          <PaymentSimulator paymentRef={ref} orderNumber={payment.order.order_number} />
        ) : (
          <p className="text-sm text-muted-foreground">Pembayaran ini sudah {payment.status}.</p>
        )}
      </div>
    </div>
  );
}
