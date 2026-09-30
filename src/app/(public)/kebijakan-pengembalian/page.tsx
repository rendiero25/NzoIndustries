import type { Metadata } from "next";

import { PageEmptyState } from "@/components/shared/page-empty-state";

// TODO [P-08]: isi konten legal resmi dari klien (UU PDP, syarat & ketentuan, retur/garansi).
export const metadata: Metadata = {
  title: "Kebijakan Pengembalian",
  robots: { index: false, follow: false },
};

export default function KebijakanPengembalianPage() {
  return (
    <PageEmptyState
      eyebrow="Kebijakan Pengembalian"
      title="Dokumen sedang disiapkan."
      description="Halaman ini akan segera tersedia. Untuk pertanyaan, hubungi layanan pelanggan kami."
    />
  );
}
