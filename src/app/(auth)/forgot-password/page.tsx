"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validations/auth";
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidgetLazy } from "@/components/auth/turnstile-widget-lazy";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    if (isTurnstileRequired() && !turnstileToken) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        captchaToken: turnstileToken ?? undefined,
      });

      if (error) {
        toast.error(
          error.message.toLowerCase().includes("captcha")
            ? "Verifikasi keamanan gagal. Coba lagi."
            : error.message,
        );
        resetTurnstile();
        return;
      }

      setSentEmail(values.email);
      setIsSent(true);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!sentEmail) return;
    if (isTurnstileRequired() && !turnstileToken) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(sentEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        captchaToken: turnstileToken ?? undefined,
      });
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("captcha")
            ? "Verifikasi keamanan gagal. Coba lagi."
            : error.message,
        );
        resetTurnstile();
        return;
      }
      toast.success("Link reset password berhasil dikirim ulang.");
      resetTurnstile();
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EA5329]/10">
          <MailCheck className="text-[#EA5329]" size={28} />
        </div>

        <div className="space-y-3">
          <h1 className="text-[28px] leading-[1.14] font-semibold text-[#1d1d1f]">
            Cek Email Kamu
          </h1>
          <p className="text-[17px] leading-[1.47] font-normal text-[#1d1d1f]">
            Link reset password telah dikirim ke <span className="font-semibold">{sentEmail}</span>.
            Cek inbox dan folder spam kamu.
          </p>
        </div>

        <TurnstileWidgetLazy
          key={turnstileKey}
          onVerify={handleTurnstileVerify}
          onExpire={() => setTurnstileToken(null)}
        />

        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleResend}
            loading={isLoading}
            className="w-full"
          >
            Kirim ulang email
          </Button>
          <Link href="/login">
            <Button type="button" variant="ghost" className="w-full">
              <ArrowLeft size={16} className="mr-2" />
              Kembali ke halaman masuk
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-[1.14] font-semibold text-[#1d1d1f]">
          Lupa Kata Sandi?
        </h1>
        <p className="text-[17px] leading-[1.47] font-normal text-[#1d1d1f]">
          Masukkan emailmu dan kami kirimkan link untuk membuat kata sandi baru.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[14px] leading-[1.43] font-normal text-[#1d1d1f]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Masukin email kamu"
            aria-invalid={!!errors.email}
            className={AUTH_INPUT_CLASS}
            {...register("email")}
          />
          {errors.email && <p className="text-[14px] text-destructive">{errors.email.message}</p>}
        </div>

        <TurnstileWidgetLazy
          key={turnstileKey}
          onVerify={handleTurnstileVerify}
          onExpire={() => setTurnstileToken(null)}
        />

        <Button type="submit" variant="primary" loading={isLoading} className="w-full">
          Kirim Link Reset
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center gap-2 text-[14px] leading-[1.43] font-normal text-[#7a7a7a] transition-colors hover:text-[#1d1d1f]"
      >
        <ArrowLeft size={14} />
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
