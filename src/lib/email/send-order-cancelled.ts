import { FROM, resend } from "@/lib/email/resend";
import { orderCancelledHtml } from "@/lib/email/templates/order-cancelled";

export async function sendOrderCancelled(params: {
  to: string;
  name: string;
  orderNumber: string;
  reason: "expired" | "cancelled" | "failed";
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";

  const subjectMap = {
    expired: `Pesanan ${params.orderNumber} Dibatalkan — Waktu Pembayaran Habis`,
    cancelled: `Pesanan ${params.orderNumber} Telah Dibatalkan`,
    failed: `Pembayaran Pesanan ${params.orderNumber} Ditolak`,
  };

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject: subjectMap[params.reason],
      html: orderCancelledHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `order-cancelled/${params.orderNumber}` },
  );

  if (error) {
    console.error("[email] sendOrderCancelled failed:", error);
  }
}
