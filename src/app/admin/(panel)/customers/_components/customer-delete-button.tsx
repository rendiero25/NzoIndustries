"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AdminTableDeleteButton } from "@/components/admin/admin-table-row-actions";
import { deleteCustomer } from "../_actions";

type Props = {
  customerId: string;
  customerName: string | null;
};

export function CustomerDeleteButton({ customerId, customerName }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const { error } = await deleteCustomer(customerId);
      if (error) {
        toast.error(error);
        setConfirm(false);
        return;
      }
      toast.success(`Pelanggan "${customerName ?? "ini"}" telah dihapus.`);
      router.push("/admin/customers");
    });
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-destructive uppercase">Yakin hapus?</span>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          loading={isPending}
        >
          Ya, Hapus
        </Button>
        <Button
          type="button"
          variant="table-action"
          size="sm"
          onClick={() => setConfirm(false)}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    );
  }

  return (
    <AdminTableDeleteButton onClick={() => setConfirm(true)} disabled={isPending}>
      Hapus
    </AdminTableDeleteButton>
  );
}
