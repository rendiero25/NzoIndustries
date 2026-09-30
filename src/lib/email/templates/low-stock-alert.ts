import { emailShell, ctaButton } from "./base";

export function lowStockAlertHtml(params: {
  productName: string;
  variantName: string;
  sku: string | null;
  stock: number;
  orderNumber: string;
  appUrl: string;
}): string {
  const urgencyColor = params.stock === 0 ? "#EA5329" : params.stock <= 2 ? "#e6a817" : "#3d3d3d";
  const urgencyLabel = params.stock === 0 ? "HABIS" : params.stock <= 2 ? "KRITIS" : "MENIPIS";

  const body = `
    <p style="margin:0 0 4px;font-size:20px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">[Admin] Stok ${urgencyLabel}</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Notifikasi otomatis: stok produk berikut memerlukan perhatian segera.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1d1d1f;">${params.productName}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#3d3d3d;">Varian: <strong>${params.variantName}</strong></p>
      ${params.sku ? `<p style="margin:0 0 4px;font-size:13px;color:#3d3d3d;">SKU: <code style="background:#e5e5ea;padding:1px 5px;border-radius:4px;font-size:12px;">${params.sku}</code></p>` : ""}
      <p style="margin:12px 0 0;font-size:13px;color:#6e6e73;">Dipicu oleh pesanan: <strong>${params.orderNumber}</strong></p>
    </div>

    <div style="background:${params.stock === 0 ? "#fff0f0" : "#fff3cd"};border-radius:10px;padding:16px 20px;margin:0 0 24px;border-left:3px solid ${urgencyColor};">
      <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#6e6e73;text-transform:uppercase;letter-spacing:0.5px;">Sisa Stok</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:${urgencyColor};line-height:1;">${params.stock} unit</p>
    </div>

    ${ctaButton(`${params.appUrl}/admin/stock`, "Kelola Stok")}`;

  return emailShell({
    title: `[Admin] Stok ${urgencyLabel}: ${params.productName} — NZO Industries`,
    preheader: `Stok ${params.productName} (${params.variantName}) tersisa ${params.stock} unit.`,
    body,
    appUrl: params.appUrl,
  });
}
