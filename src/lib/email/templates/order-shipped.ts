import { emailShell, ctaButton } from "./base";

export function orderShippedHtml(params: {
  name: string;
  orderNumber: string;
  orderId: string;
  awb?: string;
  courierCompany?: string;
  trackingUrl?: string;
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;
  const trackUrl = `${params.appUrl}/dashboard/orders/${params.orderId}/tracking`;

  const awbBlock = params.awb
    ? `<div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${
            params.courierCompany
              ? `<tr>
            <td>
              <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Kurir</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1d1d1f;">${params.courierCompany.toUpperCase()}</p>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="${params.courierCompany ? "padding-top:14px;" : ""}">
              <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Resi (AWB)</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:1px;">${params.awb}</p>
            </td>
          </tr>
        </table>
      </div>`
    : "";

  const externalTrackBlock = params.trackingUrl
    ? `<p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.6;">
          Lacak juga melalui situs kurir:
          <a href="${params.trackingUrl}" style="color:#000000;text-decoration:none;">Klik di sini</a>
        </p>`
    : "";

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Paket Dalam Perjalanan!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}! Pesananmu sudah diserahkan ke kurir dan sedang dalam perjalanan menuju alamatmu.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1d1d1f;">${params.orderNumber}</p>
    </div>

    ${awbBlock}

    <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.6;">
      Pastikan ada penerima di alamat tujuan saat paket tiba. Jika tidak ada, kurir mungkin akan menitipkan atau menjadwal ulang pengiriman.
    </p>

    ${externalTrackBlock}

    ${ctaButton(trackUrl, "Lacak Pesanan")}

    <p style="margin:8px 0 0;font-size:13px;color:#6e6e73;line-height:1.6;">
      Ada masalah dengan pengiriman? <a href="${params.appUrl}/about#kontak" style="color:#000000;text-decoration:none;">Hubungi kami</a>.
    </p>`;

  return emailShell({
    title: `Pesanan ${params.orderNumber} Sedang Dikirim — NZO Industries`,
    preheader: params.awb
      ? `Resi ${params.awb} — pesanan ${params.orderNumber} sedang dalam perjalanan.`
      : `Pesanan ${params.orderNumber} sedang dalam perjalanan menuju alamatmu.`,
    body,
    appUrl: params.appUrl,
  });
}
