"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validations/auth";
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import { Button } from "@/components/ui/button";
import { PasswordVisibilityToggle } from "@/components/ui/password-visibility-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        if (error.message.includes("same password")) {
          toast.error("Kata sandi baru tidak boleh sama dengan yang lama.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Kata sandi berhasil diperbarui!");
      await supabase.auth.signOut();
      router.push(
        "/login?message=" +
          encodeURIComponent("Kata sandi berhasil diperbarui. Silakan masuk kembali."),
      );
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-[1.14] font-semibold text-[#1d1d1f]">
          Buat Kata Sandi Baru
        </h1>
        <p className="text-[17px] leading-[1.47] font-normal text-[#1d1d1f]">
          Pilih kata sandi yang kuat untuk melindungi akunmu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-[14px] leading-[1.43] font-normal text-[#1d1d1f]"
          >
            Kata Sandi Baru
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 karakter, 1 huruf besar, 1 angka"
              aria-invalid={!!errors.password}
              className={`${AUTH_INPUT_CLASS} pr-12`}
              {...register("password")}
            />
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              className="right-3"
              iconSize={18}
            />
          </div>
          {errors.password && (
            <p className="text-[14px] text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="confirm_password"
            className="text-[14px] leading-[1.43] font-normal text-[#1d1d1f]"
          >
            Konfirmasi Kata Sandi
          </Label>
          <div className="relative">
            <Input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi baru"
              aria-invalid={!!errors.confirm_password}
              className={`${AUTH_INPUT_CLASS} pr-12`}
              {...register("confirm_password")}
            />
            <PasswordVisibilityToggle
              visible={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              className="right-3"
              iconSize={18}
            />
          </div>
          {errors.confirm_password && (
            <p className="text-[14px] text-destructive">{errors.confirm_password.message}</p>
          )}
        </div>

        <ul className="space-y-1.5 text-[14px] leading-[1.43] font-normal text-[#7a7a7a]">
          <li className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-[#7a7a7a]" />
            Minimal 8 karakter
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-[#7a7a7a]" />
            Mengandung minimal 1 huruf besar (A–Z)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-[#7a7a7a]" />
            Mengandung minimal 1 angka (0–9)
          </li>
        </ul>

        <Button type="submit" variant="primary" loading={isLoading} className="w-full">
          Simpan Kata Sandi Baru
        </Button>
      </form>
    </div>
  );
}
