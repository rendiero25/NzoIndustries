"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateCustomer } from "../_actions";

// Schema untuk form: tipe string murni agar kompatibel dengan React Hook Form.
// Konversi "" → null dilakukan saat memanggil updateCustomer.
const schema = z.object({
  full_name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  phone: z.string().regex(/^([0-9+\-\s()]{6,20})?$/, "Format nomor HP tidak valid"),
});

type FormValues = z.infer<typeof schema>;

const labelClass = "text-[11px] font-semibold uppercase text-foreground";

type Props = {
  customerId: string;
  defaultValues: { full_name: string | null; phone: string | null };
};

export function CustomerEditDialog({ customerId, defaultValues }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: defaultValues.full_name ?? "",
      phone: defaultValues.phone ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const { error } = await updateCustomer(customerId, {
        full_name: values.full_name || null,
        phone: values.phone || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Data pelanggan berhasil diperbarui.");
      setOpen(false);
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      reset({
        full_name: defaultValues.full_name ?? "",
        phone: defaultValues.phone ?? "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="dark" size="sm">
          <Pencil size={13} />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pelanggan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className={labelClass}>
              Nama Lengkap
            </Label>
            <Input id="full_name" placeholder="Nama pelanggan" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className={labelClass}>
              No. HP
            </Label>
            <Input id="phone" placeholder="08xxxxxxxxxx" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
