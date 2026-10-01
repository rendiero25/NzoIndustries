import { createClient } from "@/lib/supabase/legacy/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ items: [], count: 0 }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") return Response.json({ items: [], count: 0 }, { status: 403 });

    const [itemsRes, countRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, recipient_name")
        .is("admin_viewed_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .is("admin_viewed_at", null),
    ]);

    return Response.json({
      items: itemsRes.data ?? [],
      count: countRes.count ?? 0,
    });
  } catch {
    return Response.json({ items: [], count: 0 }, { status: 500 });
  }
}
