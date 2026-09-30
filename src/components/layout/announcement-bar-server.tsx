import { createClient } from "@/lib/supabase/server";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

export async function AnnouncementBarServer() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["announcement_enabled", "announcement_text", "announcement_link"]);

    if (!data) return null;

    const byKey = Object.fromEntries(data.map((r) => [r.key, r.value]));
    const enabled = byKey["announcement_enabled"];
    const text = byKey["announcement_text"] as string | undefined;

    if (!enabled || enabled === "false" || !text) return null;

    const link = byKey["announcement_link"] as string | undefined;

    return <AnnouncementBar text={text} link={link} />;
  } catch {
    return null;
  }
}
