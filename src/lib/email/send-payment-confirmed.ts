import { FROM, resend } from "@/lib/email/resend";
import { paymentConfirmedHtml } from "@/lib/email/templates/payment-confirmed";

export async function sendPaymentConfirmed(params: {
  to: string;
  name: string;
  orderNumber: string;
  orderId: string;
  total: number;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject: `Pembayaran ${params.orderNumber} Dikonfirmasi ✓`,
      html: paymentConfirmedHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `payment-confirmed/${params.orderNumber}` },
  );

  if (error) {
    console.error("[email] sendPaymentConfirmed failed:", error);
  }
}
