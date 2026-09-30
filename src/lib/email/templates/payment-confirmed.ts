import { emailShell, rp, ctaButton } from "./base";

export function paymentConfirmedHtml(params: {
  name: string;
  orderNumber: string;
  orderId: string;
  total: number;
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;
  const orderUrl = `${params.appUrl}/dashboard/orders/${params.orderId}`;

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Pembayaran Dikonfirmasi!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}! Pembayaran kamu sudah diterima. Tim kami segera memproses pesanan.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#1d1d1f;">${params.orderNumber}</p>
          </td>
          <td style="text-align:right;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Total Dibayar</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#1d1d1f;">${rp(params.total)}</p>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1d1d1f;">Selanjutnya:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="width:28px;vertical-align:top;font-size:14px;color:#EA5329;font-weight:700;">1.</td>
        <td style="font-size:14px;color:#3d3d3d;line-height:1.6;padding-bottom:8px;">Tim kami mengemas pesananmu dengan hati-hati.</td>
      </tr>
      <tr>
        <td style="width:28px;vertical-align:top;font-size:14px;color:#EA5329;font-weight:700;">2.</td>
        <td style="font-size:14px;color:#3d3d3d;line-height:1.6;padding-bottom:8px;">Kurir menjemput paket dari toko kami.</td>
      </tr>
      <tr>
        <td style="width:28px;vertical-align:top;font-size:14px;color:#EA5329;font-weight:700;">3.</td>
        <td style="font-size:14px;color:#3d3d3d;line-height:1.6;">Kamu akan mendapat notifikasi begitu paket dikirim beserta nomor resi.</td>
      </tr>
    </table>

    ${ctaButton(orderUrl, "Pantau Status Pesanan")}

    <p style="margin:8px 0 0;font-size:13px;color:#6e6e73;line-height:1.6;">
      Ada pertanyaan? Hubungi kami di <a href="${params.appUrl}/about#kontak" style="color:#EA5329;text-decoration:none;">halaman kontak</a>.
    </p>`;

  return emailShell({
    title: `Pembayaran ${params.orderNumber} Dikonfirmasi — NZO Industries`,
    preheader: `Pembayaran ${rp(params.total)} untuk pesanan ${params.orderNumber} berhasil dikonfirmasi.`,
    body,
    appUrl: params.appUrl,
  });
}
