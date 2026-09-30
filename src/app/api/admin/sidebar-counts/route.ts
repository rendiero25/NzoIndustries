import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ success: false }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return Response.json({ success: false }, { status: 403 });
    }

    const service = createServiceClient();
    const [complaints, returns, stock, notifications] = await Promise.all([
      service.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
      service
        .from("returns")
        .select("id", { count: "exact", head: true })
        .neq("status", "completed"),
      service
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .lt("stock", 5),
      service
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);

    const error = complaints.error ?? returns.error ?? stock.error ?? notifications.error;
    if (error) throw error;

    return Response.json({
      success: true,
      counts: {
        complaints: complaints.count ?? 0,
        returns: returns.count ?? 0,
        stock: stock.count ?? 0,
        notifications: notifications.count ?? 0,
      },
    });
  } catch {
    return Response.json({ success: false }, { status: 500 });
  }
}
