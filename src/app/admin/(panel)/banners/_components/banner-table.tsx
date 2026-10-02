"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { useConfirm } from "@/hooks/use-confirm";
import { toggleBannerActive, deleteBanner } from "../_actions";

export type BannerRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

interface BannerTableProps {
  banners: BannerRow[];
  newHref?: string;
}

function BannerActions({ banner }: { banner: BannerRow }) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleBannerActive(banner.id, !banner.is_active);
      if (error) toast.error(error);
      else toast.success(banner.is_active ? "Banner dinonaktifkan." : "Banner diaktifkan.");
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Hapus banner ini?",
      description: "Tindakan tidak bisa dibatalkan.",
    });
    if (!ok) return;
    startTransition(async () => {
      const { error } = await deleteBanner(banner.id);
      if (error) toast.error(error);
      else toast.success("Banner dihapus.");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dialog}
      <AdminTableEditLink href={`/admin/banners/${banner.id}/edit`}>Edit</AdminTableEditLink>
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
      <StatusPillToggle
        active={banner.is_active}
        onToggle={handleToggle}
        activeLabel="Aktif"
        inactiveLabel="Nonaktif"
        disabled={isPending}
        size="compact"
      />
    </div>
  );
}

const thClass =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase text-foreground";

export function BannerTable({ banners, newHref = "/admin/banners/new" }: BannerTableProps) {
  if (banners.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-20">
        <ImageIcon size={36} strokeWidth={1} className="text-foreground" />
        <p className="admin-section-title text-foreground">Belum ada banner</p>
        <Link href={newHref} className="admin-text-link">
          Tambah banner pertama
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base leading-[1.47]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={`${thClass} w-16`}>Preview</th>
              <th className={thClass}>Judul / Subtitle</th>
              <th className={`${thClass} hidden md:table-cell`}>Link</th>
              <th className={`${thClass} hidden sm:table-cell`}>Urutan</th>
              <th className={`${thClass} hidden lg:table-cell`}>Periode</th>
              <th className={thClass}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {banners.map((banner) => (
              <tr key={banner.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="relative h-9 w-14 overflow-hidden rounded-lg border border-border bg-muted/30">
                    <Image
                      src={banner.image_url}
                      alt={banner.title ?? "Banner"}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                </td>

                <td className="px-4 py-3">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {banner.title ?? <span className="text-foreground italic">Tanpa judul</span>}
                  </p>
                  {banner.subtitle && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-foreground">{banner.subtitle}</p>
                  )}
                </td>

                <td className="hidden px-4 py-3 md:table-cell">
                  {banner.link_url ? (
                    <a
                      href={banner.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 max-w-[12rem] text-sm text-brand transition-opacity hover:opacity-80"
                    >
                      {banner.link_url}
                    </a>
                  ) : (
                    <span className="text-sm text-foreground">—</span>
                  )}
                </td>

                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="font-mono text-sm text-foreground tabular-nums">
                    {banner.sort_order}
                  </span>
                </td>

                <td className="hidden px-4 py-3 lg:table-cell">
                  {banner.starts_at || banner.ends_at ? (
                    <div className="space-y-0.5 text-sm text-foreground">
                      {banner.starts_at && <p>Mulai: {formatDate(banner.starts_at)}</p>}
                      {banner.ends_at && <p>Berakhir: {formatDate(banner.ends_at)}</p>}
                    </div>
                  ) : (
                    <span className="text-sm text-foreground">Tidak terbatas</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <BannerActions banner={banner} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
