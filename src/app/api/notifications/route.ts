import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ items: [], unread: 0 }, { status: 401 });

    const [itemsRes, countRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, type, is_read, created_at, data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
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
