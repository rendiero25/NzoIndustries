import Link from "next/link";

import { Button } from "@/components/ui/button";

type Action = { label: string; href: string };

type PageEmptyStateProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
};

export function PageEmptyState({
  eyebrow = "Segera Hadir",
  title = "Belum ada konten di sini.",
  description = "Halaman ini sedang dalam persiapan. Jelajahi produk kami sementara kami menyiapkannya.",
  primaryAction = { label: "Ke Beranda", href: "/" },
  secondaryAction = { label: "Lihat Produk", href: "/products" },
}: PageEmptyStateProps) {
  return (
    <section className="flex min-h-[60vh] w-full items-center justify-center bg-white px-6 py-20">
      <div className="flex max-w-[480px] flex-col items-center text-center">
        {/* Ghost product card */}
        <div
          className="mb-10 w-[170px] overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white p-4"
          style={{ boxShadow: "rgba(0,0,0,0.22) 3px 5px 30px 0" }}
          aria-hidden="true"
        >
          <div className="mb-3 aspect-[4/3] w-full rounded-[8px] bg-[#f5f5f7]" />
          <div className="mb-2 h-3 w-4/5 rounded-full bg-[#f5f5f7]" />
          <div className="mb-3 h-3 w-3/5 rounded-full bg-[#f5f5f7]" />
          <div className="h-7 w-full rounded-full bg-[#f5f5f7]" />
        </div>

        <p className="mb-3 text-[14px] leading-[1.29] font-semibold tracking-[-0.224px] text-[#EA5329]">
          {eyebrow}
        </p>

        <h2 className="mb-3 text-[28px] leading-[1.07] font-semibold tracking-[-0.28px] text-[#1d1d1f]">
          {title}
        </h2>

        <p className="mb-8 text-[17px] leading-[1.47] font-normal tracking-[-0.374px] text-[#7a7a7a]">
          {description}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="primary">
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
          {secondaryAction ? (
            <Button asChild variant="secondary">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
