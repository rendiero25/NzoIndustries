import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentPageEditor } from "@/components/admin/promo/content-page-editor";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { CONTENT_PAGE_SLUGS } from "@/lib/validations/admin-promo";
import { listAdminContentPages } from "@/server/queries/admin/promo";

export const metadata: Metadata = { title: "Ubah halaman" };
export const dynamic = "force-dynamic";

export default async function AdminContentPageEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireRole(["owner", "admin"]);
  const { slug } = await params;
  if (!(CONTENT_PAGE_SLUGS as readonly string[]).includes(slug)) notFound();
  const page = (await listAdminContentPages()).find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/pages"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Semua halaman
      </Link>
      <PageHeader
        title={page.title}
        description="Tulis di tab Tulis, cek hasil di tab Pratinjau."
      />
      <ContentPageEditor page={page} />
    </div>
  );
}
