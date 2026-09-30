import { emailShell, rp, ctaButton, summaryRow } from "./base";

export type OrderConfirmationItem = {
  name: string;
  variantName: string;
  qty: number;
  unitPrice: number;
};

export function orderConfirmationHtml(params: {
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
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;
  const orderUrl = `${params.appUrl}/dashboard/orders/${params.orderId}`;

  const itemRows = params.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1d1d1f;line-height:1.4;">
        ${item.name}
        ${item.variantName ? `<span style="color:#6e6e73;"> &mdash; ${item.variantName}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#3d3d3d;text-align:center;white-space:nowrap;">${item.qty}x</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1d1d1f;text-align:right;white-space:nowrap;">${rp(item.unitPrice * item.qty)}</td>
    </tr>`,
    )
    .join("");

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Pesanan Diterima!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}! Pesanan kamu sudah kami terima. Selesaikan pembayaran agar pesanan segera diproses.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1d1d1f;letter-spacing:0.5px;">${params.orderNumber}</p>
    </div>

    <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1d1d1f;">Detail Pesanan</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
      ${itemRows}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      ${summaryRow("Subtotal", rp(params.subtotal))}
      ${params.discount > 0 ? summaryRow("Diskon", `&minus;${rp(params.discount)}`) : ""}
      ${summaryRow("Ongkos Kirim", rp(params.shipping))}
      ${params.fee > 0 ? summaryRow("Biaya Layanan", rp(params.fee)) : ""}
      <tr><td colspan="2" style="border-top:1px solid #e5e5ea;padding-top:10px;"></td></tr>
      ${summaryRow("Total", rp(params.total), true)}
    </table>

    <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#1d1d1f;">Pengiriman</p>
    <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.6;">
      ${params.courierName} &mdash; ${params.serviceName}
      ${params.etd ? ` &middot; Estimasi ${params.etd} hari kerja` : ""}
    </p>

    ${ctaButton(orderUrl, "Lihat Pesanan & Bayar")}

    <p style="margin:0;font-size:13px;color:#6e6e73;line-height:1.6;">
      Pesanan akan otomatis dibatalkan jika pembayaran tidak diselesaikan sebelum batas waktu.
    </p>`;

  return emailShell({
    title: `Pesanan ${params.orderNumber} Diterima — NZO Industries`,
    preheader: `Pesanan ${params.orderNumber} berhasil dibuat. Total ${rp(params.total)}.`,
    body,
    appUrl: params.appUrl,
  });
}
