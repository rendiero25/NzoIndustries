import { ADMIN_EMAIL, FROM, resend } from "@/lib/email/resend";
import { lowStockAlertHtml } from "@/lib/email/templates/low-stock-alert";

export async function sendLowStockAlert(params: {
  productName: string;
  variantName: string;
  sku: string | null;
  stock: number;
  orderNumber: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nzo-industries.test";
  const adminEmail = ADMIN_EMAIL;

  const urgency = params.stock === 0 ? "HABIS" : params.stock <= 2 ? "KRITIS" : "MENIPIS";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: adminEmail,
      subject: `[Admin] Stok ${urgency}: ${params.productName} — ${params.variantName}`,
      html: lowStockAlertHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `low-stock/${params.orderNumber}/${params.sku ?? params.variantName}` },
  );

  if (error) {
    console.error("[email] sendLowStockAlert failed:", error);
  }
}
