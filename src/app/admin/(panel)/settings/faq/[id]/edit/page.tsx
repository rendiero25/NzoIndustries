import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/legacy/server";
import { FaqForm } from "../../_components/faq-form";

export const metadata: Metadata = { title: "Edit FAQ · Admin" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFaqEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: faq } = await supabase
    .from("faqs")
    .select("id, question, answer, category, sort_order, is_active")
    .eq("id", id)
    .single();

  if (!faq) notFound();

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/settings/faq"
          className="admin-text-link mb-3 inline-flex items-center gap-1 text-xs font-medium"
        >
          <ChevronLeft size={14} />
          Kelola FAQ
        </Link>
        <p className="text-swiss-eyebrow">Toko</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Edit FAQ</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Perbarui pertanyaan atau jawaban.
        </p>
      </div>

      <FaqForm
        initialData={{
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          sort_order: faq.sort_order,
          is_active: faq.is_active,
        }}
      />
    </div>
  );
}
