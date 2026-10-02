import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { createClient } from "@/lib/supabase/server";

/**
 * Bar promo tipis (design-system.md §5), diatur admin lewat tabel `banners`
 * dengan placement `promo_bar`. RLS hanya mengembalikan banner aktif dalam periode.
 */
export async function AnnouncementBarServer() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("banners")
      .select("id, title, link_url")
      .eq("placement", "promo_bar")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data?.title) return null;
    return <AnnouncementBar id={data.id} text={data.title} link={data.link_url ?? undefined} />;
  } catch {
    return null;
  }
}
