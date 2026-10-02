export function welcomeEmailHtml({
  name,
  appUrl,
  activationUrl,
}: {
  name: string;
  appUrl: string;
  activationUrl?: string;
}): string {
  const firstName = name.split(" ")[0] ?? name;
  const year = new Date().getFullYear();

  const ctaBlock = activationUrl
    ? `
      <p style="margin:0 0 8px;font-size:15px;color:#3d3d3d;line-height:1.6;">
        Klik tombol di bawah untuk mengaktifkan akunmu dan mulai belanja:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 32px;">
        <tr>
          <td style="background:#000000;border-radius:10px;">
            <a href="${activationUrl}"
               style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
              Aktifkan Akun
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;font-size:13px;color:#8e8e93;line-height:1.6;">
        Link aktivasi berlaku selama <strong>24 jam</strong>. Jika tidak kamu minta, abaikan email ini.
      </p>`
    : `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 32px;">
        <tr>
          <td style="background:#000000;border-radius:10px;">
            <a href="${appUrl}/products"
               style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
              Mulai Belanja
            </a>
          </td>
        </tr>
      </table>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${activationUrl ? "Aktifkan Akunmu di NZO Industries" : "Selamat Datang di NZO Industries"}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${activationUrl ? `Halo ${firstName}! Aktifkan akunmu dan mulai belanja gadget original.` : `Halo ${firstName}! Akunmu sudah aktif — temukan ribuan gadget original.`}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1d1d1f;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1;">NZO Industries</p>
              <p style="margin:5px 0 0;font-size:11px;color:#8e8e93;letter-spacing:0.6px;text-transform:uppercase;">Gear up. Level up.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 12px;font-size:24px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">
                Halo, ${firstName}! 👋
              </p>
              <p style="margin:0 0 20px;font-size:16px;color:#3d3d3d;line-height:1.6;">
                ${
                  activationUrl
                    ? `Terima kasih sudah mendaftar di <strong>NZO Industries</strong>. Akunmu hampir siap — tinggal satu langkah lagi!`
                    : `Selamat datang di <strong>NZO Industries</strong>. Akunmu sudah aktif dan siap digunakan.`
                }
              </p>

              ${ctaBlock}

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1d1d1f;">Yang bisa kamu lakukan:</p>
              <ul style="margin:0 0 28px;padding-left:20px;font-size:14px;color:#3d3d3d;line-height:1.9;">
                <li>Cek ratusan produk tech original bergaransi resmi</li>
                <li>Lacak pesanan secara real-time</li>
                <li>Simpan produk favorit ke wishlist</li>
                <li>Kelola alamat pengiriman dengan mudah</li>
              </ul>

              <p style="margin:0;font-size:14px;color:#6e6e73;line-height:1.6;">
                Ada pertanyaan? Hubungi kami di
                <a href="${appUrl}/about#kontak" style="color:#000000;text-decoration:none;">halaman kontak</a>
                atau WhatsApp CS kami.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f7;border-top:1px solid #e5e5ea;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#8e8e93;">&copy; ${year} NZO Industries &mdash; Toko Tech &amp; Gadget</p>
              <p style="margin:0;font-size:11px;color:#8e8e93;">
                <a href="${appUrl}" style="color:#8e8e93;text-decoration:none;">nzo-industries.test</a>
                &nbsp;&middot;&nbsp;
                <a href="${appUrl}/about#kontak" style="color:#8e8e93;text-decoration:none;">Bantuan</a>
                &nbsp;&middot;&nbsp;
                <a href="${appUrl}/dashboard/orders" style="color:#8e8e93;text-decoration:none;">Pesanan Saya</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
