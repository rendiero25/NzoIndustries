import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { BannerTable, type BannerRow } from "./_components/banner-table";

export const metadata: Metadata = { title: "Banner — Admin NZO Industries" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const supabase = await createClient();

  const { data: banners } = await supabase
    .from("banners")
    .select(
      "id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at, created_at",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Konten</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Banner</h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            {banners?.length ?? 0} banner · diurutkan berdasarkan urutan tampil
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/banners/new">
            <Plus size={14} strokeWidth={2} />
            Tambah Banner
          </Link>
        </Button>
      </div>

      <BannerTable banners={(banners ?? []) as BannerRow[]} />
    </div>
  );
}
