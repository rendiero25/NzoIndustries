import { Markdown } from "@/components/shared/markdown";
import { StaticPage } from "@/components/storefront/static-page";
import type { PublicContentPage } from "@/server/queries/content";

const updated = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long" });

/** Halaman statis dari `content_pages` (D-39), dirender aman dari Markdown. */
export function ContentPageView({ page }: { page: PublicContentPage }) {
  return (
    <StaticPage title={page.title}>
      <Markdown source={page.body} />
      <p className="mt-10 text-caption text-muted-foreground">
        Terakhir diperbarui {updated.format(new Date(page.updatedAt))}
      </p>
    </StaticPage>
  );
}
