"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TurnstileWidgetLazy } from "@/components/auth/turnstile-widget-lazy";
import { Button } from "@/components/ui/button";
import { PasswordVisibilityToggle } from "@/components/ui/password-visibility-toggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS, AUTH_PASSWORD_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import {
  hasRememberedEmail,
  persistRememberedEmail,
  readRememberedEmail,
} from "@/lib/auth/remember-email";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";

const supabase = createClient();

export type LoginFormProps = {
  redirectTo: string;
  urlError: string | null;
  urlMessage: string | null;
};

export function LoginForm({ redirectTo, urlError, urlMessage }: LoginFormProps) {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(hasRememberedEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: readRememberedEmail(),
      password: "",
    },
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
    if (isTurnstileRequired() && !turnstileToken) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000),
      );
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
          options: { captchaToken: turnstileToken ?? undefined },
        }),
        timeout,
      ]);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email atau password salah.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Email belum diverifikasi. Cek inbox kamu.", {
            action: {
              label: "Kirim ulang",
              onClick: () => router.push("/verify-email"),
            },
          });
        } else if (error.message.toLowerCase().includes("captcha")) {
          toast.error("Verifikasi keamanan gagal. Coba lagi.");
        } else if (error.status === 429) {
          toast.error("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
        } else {
          toast.error("Gagal masuk. Coba lagi.");
        }
        resetTurnstile();
        return;
      }

      toast.success("Selamat datang kembali!");
      persistRememberedEmail(values.email, rememberMe);
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof Error && err.message === "timeout") {
        toast.error("Koneksi timeout. Periksa koneksi internet kamu dan coba lagi.");
      } else {
        toast.error("Terjadi kesalahan. Coba lagi.");
      }
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold text-foreground">Selamat Datang</h1>
        <p className="text-base font-normal text-foreground">Silahkan masukan detail Anda.</p>
      </div>

      {urlMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[14px] leading-[1.43] text-green-800">
          {urlMessage}
        </div>
      ) : null}

      {urlError ? (
        <div className="rounded-lg border border-destructive/40 bg-white px-4 py-3 text-[14px] leading-[1.43] text-destructive">
          {urlError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[14px] leading-[1.43] font-normal text-foreground">
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
          {errors.email ? (
            <p className="text-[14px] text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-[14px] leading-[1.43] font-normal text-foreground"
          >
            Kata Sandi
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              aria-invalid={!!errors.password}
              className={AUTH_PASSWORD_INPUT_CLASS}
              {...register("password")}
            />
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          </div>
          {errors.password ? (
            <p className="text-[14px] text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] leading-[1.43] font-normal text-foreground">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
              className="size-[18px] rounded-[4px] border-border data-checked:border-foreground data-checked:bg-primary"
            />
            Ingat saya
          </label>
          <Link
            href="/forgot-password"
            className="text-[14px] leading-[1.43] font-semibold text-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Lupa Kata Sandi
          </Link>
        </div>

        <TurnstileWidgetLazy
          key={turnstileKey}
          onVerify={handleTurnstileVerify}
          onExpire={resetTurnstile}
          onError={resetTurnstile}
        />

        <Button type="submit" variant="primary" loading={isLoading} className="w-full">
          Masuk
        </Button>
      </form>

      <p className="text-center text-base leading-[1.47] font-normal text-foreground">
        Tidak punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-steel-700 hover:underline"
        >
          daftar
        </Link>
      </p>
    </div>
  );
}
