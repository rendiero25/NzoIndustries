import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BrandForm } from "../_components/brand-form";

export const metadata: Metadata = { title: "Tambah Merek · Admin" };

export default function NewBrandPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <nav className="flex items-center gap-1.5 text-xs text-foreground">
        <Link href="/admin/brands" className="admin-text-link font-medium">
          Merek
        </Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-foreground">Tambah Merek</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Katalog</p>
        <h1 className="text-[34px] font-semibold text-foreground uppercase">Tambah Merek</h1>
        <p className="mt-1 text-base leading-[1.47] text-foreground">
          Buat merek baru untuk dihubungkan ke produk.
        </p>
      </div>

      <BrandForm />
    </div>
  );
}
