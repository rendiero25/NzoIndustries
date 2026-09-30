import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { BannerForm } from "../../_components/banner-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await params;
  return { title: "Edit Banner — Admin NZO Industries" };
}

export default async function AdminBannerEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: banner } = await supabase
    .from("banners")
    .select(
      "id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at, template",
    )
    .eq("id", id)
    .single();

  if (!banner) notFound();

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/banners"
          className="admin-text-link mb-4 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar banner
        </Link>
        <p className="text-swiss-eyebrow">Konten</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Edit Banner</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          {banner.title ?? "Banner tanpa judul"}
        </p>
      </div>

      <BannerForm initialData={banner} />
    </div>
  );
}
