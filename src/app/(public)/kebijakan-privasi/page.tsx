import type { Metadata } from "next";

import { PageEmptyState } from "@/components/shared/page-empty-state";

// TODO [P-08]: isi konten legal resmi dari klien (UU PDP, syarat & ketentuan, retur/garansi).
export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  robots: { index: false, follow: false },
};

export default function KebijakanPrivasiPage() {
  return (
    <PageEmptyState
      eyebrow="Kebijakan Privasi"
      title="Dokumen sedang disiapkan."
      description="Halaman ini akan segera tersedia. Untuk pertanyaan, hubungi layanan pelanggan kami."
    />
  );
}
