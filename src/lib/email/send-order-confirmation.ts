import { FROM, resend } from "@/lib/email/resend";
import {
  orderConfirmationHtml,
  type OrderConfirmationItem,
} from "@/lib/email/templates/order-confirmation";

export type { OrderConfirmationItem };

export async function sendOrderConfirmation(params: {
  to: string;
  name: string;
  orderNumber: string;
  orderId: string;
  items: OrderConfirmationItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  fee: number;
  total: number;
  courierName: string;
  serviceName: string;
  etd: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject: `Pesanan ${params.orderNumber} Diterima — NZO Industries`,
      html: orderConfirmationHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `order-confirmation/${params.orderId}` },
  );

  if (error) {
    console.error("[email] sendOrderConfirmation failed:", error);
  }
}
