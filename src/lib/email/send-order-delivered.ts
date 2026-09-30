import { FROM, resend } from "@/lib/email/resend";
import { orderDeliveredHtml } from "@/lib/email/templates/order-delivered";

export async function sendOrderDelivered(params: {
  to: string;
  name: string;
  orderNumber: string;
  orderId: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject: `Pesanan ${params.orderNumber} Sudah Sampai! Yuk Beri Ulasan`,
      html: orderDeliveredHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `order-delivered/${params.orderNumber}` },
  );

  if (error) {
    console.error("[email] sendOrderDelivered failed:", error);
  }
}
