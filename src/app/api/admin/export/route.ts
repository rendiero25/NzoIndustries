import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/legacy/server";

const STATUS_PAID = ["paid", "processing", "shipped", "delivered", "completed"] as const;

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (val: string | number | null | undefined): string => {
    const s = val == null ? "" : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");

  if (!["orders", "customers", "revenue"].includes(type ?? "")) {
    return NextResponse.json(
      { success: false, error: "type harus orders | customers | revenue" },
      { status: 400 },
    );
  }

  const supabase = await createServiceClient();
  let csv = "";
  let filename = "";

  if (type === "orders") {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, recipient_name, total, shipping_cost, discount_amount, coupon_code, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    csv = toCsv(
      [
        "ID",
        "No. Order",
        "Status",
        "Nama Penerima",
        "Total",
        "Ongkir",
        "Diskon",
        "Kupon",
        "Tanggal",
      ],
      (data ?? []).map((o) => [
        o.id,
        o.order_number,
        o.status,
        o.recipient_name,
        o.total,
        o.shipping_cost,
        o.discount_amount,
        o.coupon_code ?? "",
        o.created_at,
      ]),
    );
    filename = "export-pesanan.csv";
  }

  if (type === "customers") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    csv = toCsv(
      ["ID", "Nama Lengkap", "Tanggal Daftar"],
      (data ?? []).map((c) => [c.id, c.full_name ?? "", c.created_at]),
    );
    filename = "export-pelanggan.csv";
  }

  if (type === "revenue") {
    const { data, error } = await supabase
      .from("orders")
      .select("created_at, total")
      .in("status", STATUS_PAID)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const dayMap: Record<string, { revenue: number; orders: number }> = {};
    for (const row of data ?? []) {
      const date = row.created_at.slice(0, 10);
      if (!dayMap[date]) dayMap[date] = { revenue: 0, orders: 0 };
      dayMap[date].revenue += row.total;
      dayMap[date].orders += 1;
    }

    csv = toCsv(
      ["Tanggal", "Revenue", "Jumlah Order"],
      Object.entries(dayMap).map(([date, v]) => [date, v.revenue, v.orders]),
    );
    filename = "export-revenue.csv";
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
