import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ count: 0 }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return Response.json({ count: 0 }, { status: 403 });
    }

    const { count } = await supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("type", "new_review")
      .eq("is_read", false);

    return Response.json({ count: count ?? 0 });
  } catch {
    return Response.json({ count: 0 }, { status: 500 });
  }
}
