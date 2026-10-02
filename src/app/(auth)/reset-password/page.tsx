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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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

  // Akun yang punya faktor TOTP terverifikasi wajib sesi aal2 untuk ganti
  // password (aturan Supabase Auth). Simpan password di memori sementara
  // sampai kode authenticator diverifikasi.
  const [mfa, setMfa] = useState<{ factorId: string; password: string } | null>(null);
  const [otp, setOtp] = useState("");

  async function updatePassword(password: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      if (error.message.includes("same password")) {
        toast.error("Kata sandi baru tidak boleh sama dengan yang lama.");
      } else if (error.status === 429) {
        toast.error("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
      } else {
        toast.error("Gagal memperbarui kata sandi. Minta link reset baru lalu coba lagi.");
      }
      return;
    }

    setMfa(null);
    toast.success("Kata sandi berhasil diperbarui!");
    await supabase.auth.signOut();
    router.push(
      "/login?message=" +
        encodeURIComponent("Kata sandi berhasil diperbarui. Silakan masuk kembali."),
    );
  }

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp.find((f) => f.status === "verified");
        if (totp) {
          setMfa({ factorId: totp.id, password: values.password });
          return;
        }
      }

      await updatePassword(values.password);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  async function verifyAndUpdate() {
    if (!mfa) return;
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Masukkan 6 digit kode dari aplikasi authenticator.");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfa.factorId,
        code: otp,
      });
      if (error) {
        setOtp("");
        toast.error("Kode salah atau kedaluwarsa.");
        return;
      }
      await updatePassword(mfa.password);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  if (mfa) {
    return (
      <div className="space-y-10">
        <div className="space-y-2">
          <h1 className="text-[28px] leading-[1.14] font-semibold text-[#1d1d1f]">
            Verifikasi Dua Langkah
          </h1>
          <p className="text-[17px] leading-[1.47] font-normal text-[#1d1d1f]">
            Akun ini memakai aplikasi authenticator. Masukkan kode 6 digit untuk menyimpan kata
            sandi baru.
          </p>
        </div>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyAndUpdate();
          }}
        >
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-label="Kode verifikasi 6 digit"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={otp.length !== 6}
            className="w-full"
          >
            Verifikasi & Simpan
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setMfa(null);
              setOtp("");
            }}
          >
            Kembali
          </Button>
        </form>
      </div>
    );
  }

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
