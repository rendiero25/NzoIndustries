export function rp(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export function formatWIB(isoDate: string | null | undefined): string {
  if (!isoDate) return "-";
  try {
    const d = new Date(isoDate);
    return (
      d.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) + " WIB"
    );
  } catch {
    return isoDate;
  }
}

export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
  <tr>
    <td style="background:#000000;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">${label}</a>
    </td>
  </tr>
</table>`;
}

export function summaryRow(label: string, value: string, bold = false): string {
  const style = bold
    ? "font-size:15px;font-weight:600;color:#1d1d1f;"
    : "font-size:14px;color:#3d3d3d;";
  return `<tr>
  <td style="${style}padding:5px 0;">${label}</td>
  <td style="${style}padding:5px 0;text-align:right;">${value}</td>
</tr>`;
}

export function emailShell(opts: {
  title: string;
  preheader: string;
  body: string;
  appUrl: string;
}): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:#1d1d1f;padding:26px 32px;text-align:center;">
              <p style="margin:0;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;line-height:1;">NZO Industries</p>
              <p style="margin:5px 0 0;font-size:11px;color:#8e8e93;">Part yang pas untuk kendaraanmu</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              ${opts.body}
            </td>
          </tr>
          <tr>
            <td style="background:#f5f5f7;border-top:1px solid #e5e5ea;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#8e8e93;">&copy; ${year} NZO Industries &mdash; Toko Tech &amp; Gadget</p>
              <p style="margin:0;font-size:11px;color:#8e8e93;">
                <a href="${opts.appUrl}" style="color:#8e8e93;text-decoration:none;">nzo-industries.test</a>
                &nbsp;&middot;&nbsp;
                <a href="${opts.appUrl}/about#kontak" style="color:#8e8e93;text-decoration:none;">Bantuan</a>
                &nbsp;&middot;&nbsp;
                <a href="${opts.appUrl}/dashboard/orders" style="color:#8e8e93;text-decoration:none;">Pesanan Saya</a>
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
