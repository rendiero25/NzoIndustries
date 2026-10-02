import { emailShell, ctaButton } from "./base";

const reasonLabel: Record<string, { title: string; desc: string }> = {
  expired: {
    title: "Batas Waktu Pembayaran Terlewat",
    desc: "Pesanan dibatalkan otomatis karena pembayaran tidak diselesaikan sebelum batas waktu.",
  },
  cancelled: {
    title: "Pesanan Dibatalkan",
    desc: "Pesanan telah dibatalkan. Jika ini bukan keinginanmu, silakan hubungi CS kami.",
  },
  failed: {
    title: "Pembayaran Ditolak",
    desc: "Pembayaran untuk pesanan ini ditolak oleh sistem. Kamu bisa mencoba lagi dengan metode pembayaran lain.",
  },
};

export function orderCancelledHtml(params: {
  name: string;
  orderNumber: string;
  reason: "expired" | "cancelled" | "failed";
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;
  const info = reasonLabel[params.reason] ?? reasonLabel.cancelled;

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Pesanan Dibatalkan</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}. Sayangnya pesanan berikut tidak dapat diproses.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1d1d1f;">${params.orderNumber}</p>
    </div>

    <div style="background:#fff0f0;border-radius:10px;padding:16px 20px;margin:0 0 24px;border-left:3px solid #000000;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1d1d1f;">${info.title}</p>
      <p style="margin:0;font-size:13px;color:#3d3d3d;line-height:1.6;">${info.desc}</p>
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.6;">
      Jika ada pembayaran yang sudah masuk, dana akan dikembalikan dalam <strong>1&ndash;14 hari kerja</strong> sesuai kebijakan bank atau metode pembayaramu.
    </p>

    ${ctaButton(`${params.appUrl}/products`, "Belanja Lagi")}

    <p style="margin:8px 0 0;font-size:13px;color:#6e6e73;line-height:1.6;">
      Perlu bantuan? <a href="${params.appUrl}/about#kontak" style="color:#000000;text-decoration:none;">Hubungi CS kami</a>.
    </p>`;

  return emailShell({
    title: `Pesanan ${params.orderNumber} Dibatalkan — NZO Industries`,
    preheader: `Pesanan ${params.orderNumber} telah dibatalkan. ${info.title}.`,
    body,
    appUrl: params.appUrl,
  });
}
