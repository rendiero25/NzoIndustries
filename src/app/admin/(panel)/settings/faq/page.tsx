import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/legacy/server";
import { SettingsNav } from "../_components/settings-nav";
import { FaqTable, type FaqRow } from "./_components/faq-table";

export const metadata: Metadata = { title: "Kelola FAQ — Admin NZO Industries" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsFaqPage() {
  const supabase = await createClient();

  const { data: faqs } = await supabase
    .from("faqs")
    .select("id, question, answer, category, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("question", { ascending: true });

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/settings"
            className="admin-text-link mb-2 inline-flex items-center gap-1 text-xs font-medium"
          >
            <ChevronLeft size={14} />
            Pengaturan
          </Link>
          <p className="text-swiss-eyebrow">Toko</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">Kelola FAQ</h1>
          <p className="mt-1 text-base leading-[1.47] text-foreground">
            Pertanyaan yang sering diajukan pelanggan.
          </p>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0 gap-2">
          <Link href="/admin/settings/faq/new">
            <Plus size={14} strokeWidth={2} />
            Tambah FAQ
          </Link>
        </Button>
      </div>

      <SettingsNav />

      <FaqTable faqs={(faqs ?? []) as FaqRow[]} />
    </div>
  );
}
