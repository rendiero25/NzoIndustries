import { emailShell, rp, ctaButton, formatWIB } from "./base";

function paymentBlock(params: {
  paymentType: string | null;
  vaBank: string | null;
  vaNumber: string | null;
  paymentCode: string | null;
}): string {
  if (params.vaNumber) {
    const bankLabel = params.vaBank?.toUpperCase() ?? "Bank Transfer";
    return `
      <div style="background:#f5f5f7;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Bank</p>
        <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1d1d1f;">${bankLabel}</p>
        <p style="margin:0 0 3px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Virtual Account</p>
        <p style="margin:0;font-size:26px;font-weight:700;color:#1d1d1f;letter-spacing:1.5px;">${params.vaNumber}</p>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.7;">
        Transfer tepat sesuai nominal di atas ke nomor VA tersebut. Pembayaran akan dikonfirmasi otomatis dalam beberapa menit.
      </p>`;
  }

  if (params.paymentCode) {
    const storeLabel =
      params.paymentType === "cstore" ? "Alfamart / Indomaret" : "Gerai Pembayaran";
    return `
      <div style="background:#f5f5f7;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Gerai</p>
        <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1d1d1f;">${storeLabel}</p>
        <p style="margin:0 0 3px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Kode Pembayaran</p>
        <p style="margin:0;font-size:26px;font-weight:700;color:#1d1d1f;letter-spacing:1.5px;">${params.paymentCode}</p>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.7;">
        Tunjukkan kode di atas ke kasir ${storeLabel} dan bayar sesuai nominal. Simpan struk sebagai bukti pembayaran.
      </p>`;
  }

  return `<p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.7;">
    Klik tombol Bayar Sekarang, lalu pilih metode pembayaran (QRIS, Virtual Account, e-wallet, atau gerai retail) di halaman pembayaran.
  </p>`;
}

export function paymentInstructionsHtml(params: {
  name: string;
  orderNumber: string;
  orderId: string;
  total: number;
  paymentType: string | null;
  vaBank: string | null;
  vaNumber: string | null;
  paymentCode: string | null;
  paymentUrl: string | null;
  expiryTime: string | null;
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;
  const orderUrl = `${params.appUrl}/dashboard/orders/${params.orderId}`;

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Selesaikan Pembayaran</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}! Pesanan kamu menunggu pembayaran. Segera selesaikan sebelum batas waktu.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#1d1d1f;">${params.orderNumber}</p>
          </td>
          <td style="text-align:right;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Total Bayar</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#000000;">${rp(params.total)}</p>
          </td>
        </tr>
      </table>
    </div>

    ${paymentBlock(params)}

    ${
      params.expiryTime
        ? `<div style="background:#fff3cd;border-radius:10px;padding:14px 18px;margin:0 0 24px;border-left:3px solid #e6a817;">
        <p style="margin:0;font-size:13px;color:#7a5200;">
          ⏱ Batas pembayaran: <strong>${formatWIB(params.expiryTime)}</strong>
        </p>
      </div>`
        : ""
    }

    ${params.paymentUrl ? ctaButton(params.paymentUrl, "Bayar Sekarang") : ctaButton(orderUrl, "Lihat Detail Pesanan")}

    <p style="margin:8px 0 0;font-size:13px;color:#6e6e73;line-height:1.6;">
      Jika mengalami kendala, hubungi CS kami melalui <a href="${params.appUrl}/about#kontak" style="color:#000000;text-decoration:none;">halaman kontak</a>.
    </p>`;

  return emailShell({
    title: `Selesaikan Pembayaran ${params.orderNumber} — NZO Industries`,
    preheader: `Bayar ${rp(params.total)} untuk pesanan ${params.orderNumber} sebelum batas waktu.`,
    body,
    appUrl: params.appUrl,
  });
}
