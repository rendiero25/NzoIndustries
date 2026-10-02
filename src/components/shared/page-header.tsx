import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Breadcrumb atau tautan kembali di atas judul. */
  breadcrumb?: ReactNode;
  /** Tombol aksi di kanan (desktop) / bawah judul (mobile). */
  actions?: ReactNode;
  className?: string;
};

/** Judul halaman h1 + deskripsi + aksi (design-system.md §3, §6). Rata kiri. */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-6", className)}>
      {breadcrumb}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-prose flex-col gap-1.5">
          <h1>{title}</h1>
          {description ? <div className="text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
