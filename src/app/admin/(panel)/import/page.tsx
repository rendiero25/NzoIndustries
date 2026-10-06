import type { Metadata } from "next";

import { ImportHistory } from "@/components/admin/import-history";
import { ImportWorkbench } from "@/components/admin/import-workbench";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import produk" };

export default async function AdminImportPage() {
  await requireRole(["owner", "admin"]);
  const supabase = await createClient();
  const [{ data: batches }, { data: categories }] = await Promise.all([
    supabase
      .from("import_batches")
      .select(
        "id, source, status, file_name, total_rows, success_rows, failed_rows, skipped_rows, created_at, finished_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("categories").select("slug"),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Import produk"
        description="Unggah export Daftar Harga Jubelio atau template NZO. Semua produk masuk sebagai draft dan baru tampil di toko setelah dipublikasikan."
      />
      <ImportWorkbench categorySlugs={(categories ?? []).map((c) => c.slug)} />
      <section aria-labelledby="riwayat-import" className="space-y-4">
        <h2 id="riwayat-import" className="text-xl">
          Riwayat import
        </h2>
        <ImportHistory batches={batches ?? []} />
      </section>
    </div>
  );
}
