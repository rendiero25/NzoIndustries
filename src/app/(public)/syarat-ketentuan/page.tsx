import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";

// TODO [P-08]: isi konten legal resmi dari klien (UU PDP, syarat & ketentuan, retur/garansi).
export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  robots: { index: false, follow: false },
};

export default function SyaratKetentuanPage() {
  return (
    <div className="nzo-container py-16 md:py-24">
      <h1 className="mb-2">Syarat & Ketentuan</h1>
      <EmptyState
        icon={FileText}
        title="Dokumen syarat & ketentuan sedang disiapkan"
        description="Sementara itu, tanyakan langsung ke layanan pelanggan lewat WhatsApp."
        action={{ label: "Kembali belanja", href: "/" }}
        className="items-start px-0 text-left"
      />
    </div>
  );
}
