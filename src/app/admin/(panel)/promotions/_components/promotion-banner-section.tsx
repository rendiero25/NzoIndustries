import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { BannerTable, type BannerRow } from "@/app/admin/(panel)/banners/_components/banner-table";

type Props = {
  template: string;
};

export async function PromotionBannerSection({ template }: Props) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("banners")
    .select(
      "id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at, created_at",
    )
    .eq("template", template)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const banners = (data ?? []) as BannerRow[];

  return (
    <div className="space-y-3">
      <h2 className="admin-section-title text-foreground">Banner Promosi</h2>
      <BannerTable banners={banners} newHref={`/admin/banners/new?template=${template}`} />
    </div>
  );
}
