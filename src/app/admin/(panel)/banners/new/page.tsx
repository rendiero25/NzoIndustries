import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { BannerForm } from "../_components/banner-form";
import { templateToPromotionAdminPath } from "@/lib/banner-template-utils";

export const metadata: Metadata = { title: "Tambah Banner — Admin NZO Industries" };

type SearchParams = Promise<{ template?: string }>;

export default async function AdminBannerNewPage({ searchParams }: { searchParams: SearchParams }) {
  const { template } = await searchParams;
  const backHref = template ? templateToPromotionAdminPath(template) : "/admin/banners";

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <Link href={backHref} className="admin-text-link mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft size={13} />
          Kembali
        </Link>
        <p className="text-swiss-eyebrow">Konten</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Tambah Banner</h1>
      </div>

      <BannerForm template={template ?? null} />
    </div>
  );
}
