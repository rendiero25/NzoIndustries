import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { listAdminContentPages } from "@/server/queries/admin/promo";

export const metadata: Metadata = { title: "Halaman statis" };
export const dynamic = "force-dynamic";

const PATH: Record<string, string> = {
  about: "/about",
  faq: "/faq",
  "how-to-buy": "/how-to-buy",
  contact: "/contact",
  privacy: "/kebijakan-privasi",
  terms: "/syarat-ketentuan",
  "returns-policy": "/kebijakan-pengembalian",
};

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminPagesPage() {
  await requireRole(["owner", "admin"]);
  const pages = await listAdminContentPages();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Halaman statis"
        description="Isi ditulis dalam Markdown. Selama belum tayang, toko memakai teks bawaan aplikasi."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {pages.map((p) => (
          <Link key={p.id} href={`/admin/pages/${p.slug}`}>
            <Card className="h-full transition-colors hover:border-steel-500">
              <CardContent className="flex items-start gap-3 p-5">
                <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {p.title}
                    {p.isPublished ? (
                      <Badge variant="secondary">Tayang</Badge>
                    ) : (
                      <Badge variant="outline">Teks bawaan</Badge>
                    )}
                  </span>
                  <span className="font-mono text-caption text-muted-foreground">
                    {PATH[p.slug]}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    Diubah {date.format(new Date(p.updatedAt))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
