import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ items: [], unread: 0 }, { status: 401 });

    // Cek role admin via profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return Response.json({ items: [], unread: 0 }, { status: 403 });
    }

    const [itemsRes, countRes] = await Promise.all([
      supabase
        .from("admin_notifications")
        .select("id, title, body, type, is_read, created_at, data")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);

    return Response.json({
      items: itemsRes.data ?? [],
      unread: countRes.count ?? 0,
    });
  } catch {
    return Response.json({ items: [], unread: 0 }, { status: 500 });
  }
}
