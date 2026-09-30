"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updatePasswordAction } from "@/app/(dashboard)/dashboard/profile/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="w-full space-y-5 rounded-xl border border-[#e0e0e0] bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const a = String(fd.get("password") ?? "");
        const b = String(fd.get("password2") ?? "");
        if (a !== b) {
          toast.error("Konfirmasi password tidak sama.");
          return;
        }
        startTransition(async () => {
          const res = await updatePasswordAction({ newPassword: a });
          if (res.success) {
            toast.success("Password berhasil diubah.");
            e.currentTarget.reset();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div>
        <Label htmlFor="password">Password baru</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <div>
        <Label htmlFor="password2">Ulangi password baru</Label>
        <Input
          id="password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Perbarui password
      </Button>
    </form>
  );
}
