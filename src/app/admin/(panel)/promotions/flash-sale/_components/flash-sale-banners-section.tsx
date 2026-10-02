import "server-only";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import { BannerTable, type BannerRow } from "@/app/admin/(panel)/banners/_components/banner-table";

import { flashSaleBannerTemplate } from "../_lib/flash-sale-banner-template";

type FlashSaleBannersSectionProps = {
  flashSaleId: string;
};

/** Banner promosi khusus satu flash sale (`banners.template` = `flash_sale:<id>`). */
export async function FlashSaleBannersSection({ flashSaleId }: FlashSaleBannersSectionProps) {
  const template = flashSaleBannerTemplate(flashSaleId);
  const encodedTemplate = encodeURIComponent(template);
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
    <div className="space-y-3 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <h2 className="admin-section-title text-foreground">Banner Flash Sale</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
          Opsional
        </span>
      </div>
      <BannerTable banners={banners} newHref={`/admin/banners/new?template=${encodedTemplate}`} />
    </div>
  );
}
