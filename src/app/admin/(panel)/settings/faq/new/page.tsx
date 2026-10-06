import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FaqForm } from "../_components/faq-form";

export const metadata: Metadata = { title: "Tambah FAQ · Admin" };

export default function AdminFaqNewPage() {
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
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Tambah FAQ</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Buat entri pertanyaan dan jawaban baru.
        </p>
      </div>

      <FaqForm />
    </div>
  );
}
