"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { StarRatingDisplay } from "@/components/shared/star-rating-display";
import { toast } from "sonner";

import { formatRelativeDate } from "@/lib/format";
import { AdminTableDeleteButton } from "@/components/admin/admin-table-row-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteReview, updateReview } from "../_actions";
import { useConfirm } from "@/hooks/use-confirm";

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  deleted_at: string | null;
  created_at: string;
  product_id: string;
  products: { name: string; slug: string } | null;
  profiles: { full_name: string | null } | null;
};

interface ReviewTableProps {
  reviews: ReviewRow[];
  page: number;
  totalPages: number;
}

function ReviewDeleteAction({ review }: { review: ReviewRow }) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Hapus ulasan ini?",
      description: "Tindakan tidak bisa dibatalkan.",
    });
    if (!ok) return;
    startTransition(async () => {
      const { error } = await deleteReview(review.id);
      if (error) toast.error(error);
      else toast.success("Ulasan dihapus.");
    });
  };

  return (
    <>
      {dialog}
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
    </>
  );
}

function ReviewEditDialog({
  review,
  open,
  onClose,
}: {
  review: ReviewRow;
  open: boolean;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await updateReview({
        reviewId: review.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) {
        toast.error(error);
      } else {
        toast.success("Ulasan diperbarui.");
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Ulasan</DialogTitle>
        </DialogHeader>
        <div className="mb-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{review.profiles?.full_name ?? "—"}</span>
          {" · "}
          {review.products?.name ?? "—"}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Rating</Label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} bintang
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Komentar
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Tidak ada komentar"
              maxLength={4000}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRowActions({ review }: { review: ReviewRow }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="primary" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <ReviewDeleteAction review={review} />
      </div>
      {editOpen && (
        <ReviewEditDialog review={review} open={editOpen} onClose={() => setEditOpen(false)} />
      )}
    </>
  );
}

export function ReviewTable({ reviews, page, totalPages }: ReviewTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (reviews.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <MessageSquare size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada ulasan</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Produk
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Rating
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                  Komentar
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviews.map((review) => (
                <tr key={review.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{review.profiles?.full_name ?? "—"}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="line-clamp-1 text-xs text-foreground">
                      {review.products?.name ?? "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StarRatingDisplay rating={review.rating} size="xs" />
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="line-clamp-2 max-w-xs text-xs text-foreground">
                      {review.comment ?? <span className="italic">Tidak ada komentar</span>}
                    </p>
                    {review.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {review.images.map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-10 w-10 overflow-hidden rounded-md border border-border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Foto ulasan ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-foreground">
                      {formatRelativeDate(review.created_at)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <ReviewRowActions review={review} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
