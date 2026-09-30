import { FROM, resend } from "@/lib/email/resend";
import { refundProcessedHtml } from "@/lib/email/templates/refund-processed";

export async function sendRefundProcessed(params: {
  to: string;
  name: string;
  orderNumber: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject: `Refund Pesanan ${params.orderNumber} Dikonfirmasi`,
      html: refundProcessedHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `refund-processed/${params.orderNumber}` },
  );

  if (error) {
    console.error("[email] sendRefundProcessed failed:", error);
  }
}
