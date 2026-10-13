"use client";

import { Eye, EyeOff, MessageSquareReply, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/account/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_STATUS_META } from "@/lib/orders/status";
import { moderateReview } from "@/server/actions/admin/service";
import type { AdminReview } from "@/server/queries/admin/service";

const date = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" });

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= rating ? "size-4 fill-signal text-signal" : "size-4 text-steel-200"}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function ReviewModeration({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [reply, setReply] = useState("");

  const act = (review: AdminReview, status: AdminReview["status"], replyText?: string | null) =>
    start(async () => {
      const res = await moderateReview({
        id: review.id,
        status,
        reply: replyText === undefined ? (review.reply ?? "") : (replyText ?? ""),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        replyText !== undefined
          ? "Balasan disimpan."
          : status === "published"
            ? "Ulasan ditayangkan."
            : "Ulasan disembunyikan.",
      );
      setReplying(null);
      router.refresh();
    });

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Tidak ada ulasan"
        description="Ulasan pelanggan akan muncul di sini."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => {
          const meta = REVIEW_STATUS_META[r.status] ?? {
            label: r.status,
            tone: "neutral" as const,
          };
          return (
            <li key={r.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      {r.productSlug ? (
                        <Link
                          href={`/products/${r.productSlug}`}
                          target="_blank"
                          className="line-clamp-1 font-medium hover:underline"
                        >
                          {r.productName}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.productName}</span>
                      )}
                      <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Stars rating={r.rating} /> {r.reviewer} ·{" "}
                        {date.format(new Date(r.createdAt))}
                      </span>
                    </div>
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </div>
                  {r.comment ? (
                    <p className="text-sm leading-6 whitespace-pre-line">{r.comment}</p>
                  ) : null}
                  {r.imageUrls.length ? (
                    <div className="flex flex-wrap gap-2">
                      {r.imageUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- foto pelanggan dari Storage publik */}
                          <img
                            src={url}
                            alt="Foto ulasan"
                            className="size-20 rounded-md border border-border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {r.reply ? (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <span className="mb-1 block text-caption font-medium text-muted-foreground">
                        Balasan toko
                      </span>
                      {r.reply}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {r.status !== "published" ? (
                      <Button size="sm" disabled={pending} onClick={() => act(r, "published")}>
                        <Eye /> Tayangkan
                      </Button>
                    ) : null}
                    {r.status !== "hidden" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => act(r, "hidden")}
                      >
                        <EyeOff /> Sembunyikan
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setReplying(r);
                        setReply(r.reply ?? "");
                      }}
                    >
                      <MessageSquareReply /> {r.reply ? "Ubah balasan" : "Balas"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog open={replying !== null} onOpenChange={(o) => !o && setReplying(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Balas ulasan</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {replying?.productName}. Balasan tampil di halaman produk; menyimpan balasan juga
              menayangkan ulasan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rv-reply">Balasan ({reply.length}/1000)</Label>
            <Textarea
              id="rv-reply"
              rows={5}
              maxLength={1000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <span className="text-caption text-muted-foreground">
              Kosongkan untuk menghapus balasan.
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplying(null)} disabled={pending}>
              Batal
            </Button>
            <Button
              disabled={pending}
              onClick={() => replying && act(replying, "published", reply)}
            >
              {pending ? "Menyimpan…" : "Simpan & tayangkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
