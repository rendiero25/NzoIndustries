import * as XLSX from "xlsx";

import { checkRole } from "@/lib/auth/guards";
import { reportRangeSchema } from "@/lib/validations/admin-system";
import { getSalesReport } from "@/server/queries/admin/system";

export const dynamic = "force-dynamic";

/** GET /admin/reports/export?from&to&group — XLSX laporan penjualan (owner/admin). */
export async function GET(req: Request) {
  const { decision } = await checkRole(["owner", "admin"]);
  if (!decision.ok) return new Response("Forbidden", { status: 403 });

  const sp = new URL(req.url).searchParams;
  const parsed = reportRangeSchema.safeParse({
    from: sp.get("from"),
    to: sp.get("to"),
    group: sp.get("group") === "month" ? "month" : "day",
  });
  if (!parsed.success) return new Response("Periode tidak valid", { status: 400 });

  let report;
  try {
    report = await getSalesReport(parsed.data);
  } catch {
    return new Response("Export gagal", { status: 500 });
  }

  const t = report.totals;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Ringkasan: "Periode", Nilai: `${parsed.data.from} s.d. ${parsed.data.to} (WIB)` },
      { Ringkasan: "Pesanan dibayar", Nilai: t.orders },
      { Ringkasan: "Pendapatan (Rp)", Nilai: t.revenue },
      { Ringkasan: "Subtotal barang (Rp)", Nilai: t.subtotal },
      { Ringkasan: "Ongkir (Rp)", Nilai: t.shipping },
      { Ringkasan: "Diskon (Rp)", Nilai: t.discount },
      { Ringkasan: "Barang terjual", Nilai: t.items },
    ]),
    "Ringkasan",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      report.series.map((s) => ({
        Periode: s.period,
        Pesanan: s.orders,
        "Pendapatan (Rp)": s.revenue,
      })),
    ),
    "Per periode",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      report.products.map((p) => ({ Produk: p.name, Qty: p.qty, "Pendapatan (Rp)": p.revenue })),
    ),
    "Per produk",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      report.categories.map((c) => ({
        Kategori: c.name,
        Qty: c.qty,
        "Pendapatan (Rp)": c.revenue,
      })),
    ),
    "Per kategori",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      report.payments.map((p) => ({
        Metode: p.method,
        Pesanan: p.orders,
        "Pendapatan (Rp)": p.revenue,
      })),
    ),
    "Per metode bayar",
  );
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-nzo-${parsed.data.from}_${parsed.data.to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
