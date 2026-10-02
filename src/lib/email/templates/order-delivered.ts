import { emailShell, ctaButton } from "./base";

export function orderDeliveredHtml(params: {
  name: string;
  orderNumber: string;
  orderId: string;
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;
  const reviewUrl = `${params.appUrl}/dashboard/orders/${params.orderId}/review`;
  const orderUrl = `${params.appUrl}/dashboard/orders/${params.orderId}`;

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Paket Sudah Sampai!</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}! Pesananmu sudah tiba di tujuan. Semoga kamu puas dengan produknya!
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1d1d1f;">${params.orderNumber}</p>
    </div>

    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1d1d1f;">Bagaimana pengalamanmu?</p>
    <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.6;">
      Ulasanmu sangat berarti bagi kami dan membantu pembeli lain membuat keputusan yang tepat.
      Luangkan 1 menit untuk memberikan ulasan!
    </p>

    ${ctaButton(reviewUrl, "Tulis Ulasan")}

    <p style="margin:12px 0 0;font-size:14px;color:#3d3d3d;line-height:1.6;">
      Ada kendala dengan produk? <a href="${orderUrl}" style="color:#000000;text-decoration:none;">Buka pesanan</a> dan ajukan komplain dalam 7 hari sejak diterima.
    </p>`;

  return emailShell({
    title: `Pesanan ${params.orderNumber} Telah Sampai — NZO Industries`,
    preheader: `Paket pesanan ${params.orderNumber} sudah tiba! Bagikan ulasanmu.`,
    body,
    appUrl: params.appUrl,
  });
}
