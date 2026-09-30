"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteAddressAction } from "@/app/(dashboard)/dashboard/addresses/_actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

export function AddressDeleteButton({ addressId }: { addressId: string }) {
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
        onClick={async () => {
          if (!(await confirm({ title: "Hapus alamat ini?" }))) return;
          startTransition(async () => {
            const res = await deleteAddressAction(addressId);
            if (res.success) {
              toast.success("Alamat dihapus.");
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
