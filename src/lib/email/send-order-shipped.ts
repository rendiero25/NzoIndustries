import { FROM, resend } from "@/lib/email/resend";
import { orderShippedHtml } from "@/lib/email/templates/order-shipped";

export async function sendOrderShipped(params: {
  to: string;
  name: string;
  orderNumber: string;
  orderId: string;
  awb?: string;
  courierCompany?: string;
  trackingUrl?: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const subject = params.awb
    ? `Pesanan ${params.orderNumber} Dikirim — Resi: ${params.awb}`
    : `Pesanan ${params.orderNumber} Sedang Dikirim`;

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject,
      html: orderShippedHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `order-shipped/${params.orderNumber}` },
  );

  if (error) {
    console.error("[email] sendOrderShipped failed:", error);
  }
}
