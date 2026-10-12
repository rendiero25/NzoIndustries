"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReview } from "@/server/actions/account/after-sales";

import { MediaUploader } from "./media-uploader";

const LABELS = ["", "Sangat buruk", "Buruk", "Cukup", "Bagus", "Sangat bagus"];

/** Tulis ulasan satu item pesanan (moderasi admin sebelum tayang). */
export function ReviewDialog({
  orderItemId,
  productName,
  trigger,
}: {
  orderItemId: string;
  productName: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function submit() {
    if (rating < 1) {
      toast.error("Pilih rating dulu.");
      return;
    }
    start(async () => {
      const res = await submitReview({
        orderItemId,
        rating,
        comment: comment.trim() || undefined,
        imagePaths: paths,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Ulasan terkirim", {
        description: "Ulasan tampil setelah diperiksa tim kami.",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            Tulis ulasan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tulis ulasan</DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Rating</legend>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} bintang`}
                  onClick={() => setRating(n)}
                  className="flex size-10 items-center justify-center rounded-md hover:bg-steel-50"
                >
                  <Star
                    className={cn(
                      "size-7",
                      n <= rating ? "fill-rating text-rating" : "text-steel-200",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{LABELS[rating]}</span>
            </div>
          </fieldset>
          <div className="grid gap-2">
            <Label htmlFor="review-comment">Ceritakan pengalamanmu (opsional)</Label>
            <Textarea
              id="review-comment"
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Kualitas, kecocokan dengan kendaraan, kemudahan pasang…"
            />
          </div>
          <MediaUploader bucket="review-images" max={5} onChange={setPaths} label="Foto produk" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Spinner className="size-4" /> : null}
            Kirim ulasan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
