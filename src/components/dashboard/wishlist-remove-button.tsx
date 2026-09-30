"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { removeWishlistItemAction } from "@/app/(dashboard)/dashboard/wishlist/_actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";

export function WishlistRemoveButton({
  wishlistId,
  className,
}: {
  wishlistId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  return (
    <>
      {dialog}
      <Button
        type="button"
        variant="destructive-ghost"
        size="sm"
        disabled={pending}
        className={className}
        onClick={async () => {
          if (!(await confirm({ title: "Hapus dari wishlist?" }))) return;
          startTransition(async () => {
            const res = await removeWishlistItemAction(wishlistId);
            if (res.success) {
              toast.success("Dihapus dari wishlist.");
              router.refresh();
            } else {
              toast.error(res.error);
            }
          });
        }}
      >
        Hapus
      </Button>
    </>
  );
}
