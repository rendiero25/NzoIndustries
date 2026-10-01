import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/legacy/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("status", "delivered")
    .lt("delivered_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders || orders.length === 0) return NextResponse.json({ updated: 0 });

  const ids = orders.map((o) => o.id);
  await supabase.from("orders").update({ status: "completed" }).in("id", ids);

  await supabase.from("order_status_history").insert(
    ids.map((id) => ({
      order_id: id,
      status: "completed" as const,
      note: "Auto-selesai 3 hari setelah diterima",
      changed_by: null,
    })),
  );

  console.log(`[cron] Auto-completed ${ids.length} orders`);
  return NextResponse.json({ updated: ids.length });
}
