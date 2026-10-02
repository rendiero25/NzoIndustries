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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth";
import { signUpAction } from "@/server/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  const onSubmit = async (values: RegisterFormValues) => {
    if (isTurnstileRequired() && !turnstileToken) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpAction({
        ...values,
        email: values.email.trim(),
        turnstileToken: turnstileToken ?? undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        resetTurnstile();
        return;
      }

      router.push("/verify-email?email=" + encodeURIComponent(values.email.trim()));
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[1.75rem] leading-9">Buat akun</h1>
        <p className="text-muted-foreground">Daftar untuk mulai belanja di NZO Industries.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-sm font-medium">
              Nama depan
            </Label>
            <Input
              id="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="Budi"
              aria-invalid={!!errors.first_name}
              className={AUTH_INPUT_CLASS}
              {...register("first_name")}
            />
            {errors.first_name ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.first_name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-sm font-medium">
              Nama belakang
            </Label>
            <Input
              id="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Santoso"
              aria-invalid={!!errors.last_name}
              className={AUTH_INPUT_CLASS}
              {...register("last_name")}
            />
            {errors.last_name ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.last_name.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              No Telepon
            </Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              aria-invalid={!!errors.phone}
              className={AUTH_INPUT_CLASS}
              {...register("phone")}
            />
            {errors.phone ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              aria-invalid={!!errors.email}
              className={AUTH_INPUT_CLASS}
              {...register("email")}
            />
            {errors.email ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Kata Sandi
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
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
            {errors.password ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-sm font-medium">
              Ulangi kata sandi
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
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
            {errors.confirm_password ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.confirm_password.message}
              </p>
            ) : null}
          </div>
        </div>

        <TurnstileWidgetLazy
          key={turnstileKey}
          onVerify={handleTurnstileVerify}
          onExpire={resetTurnstile}
          onError={resetTurnstile}
        />

        <p className="text-[12px] leading-relaxed font-normal text-muted-foreground">
          Dengan mendaftar, kamu setuju dengan{" "}
          <Link
            href="/syarat-ketentuan"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Syarat & Ketentuan
          </Link>{" "}
          dan{" "}
          <Link
            href="/kebijakan-privasi"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Kebijakan Privasi
          </Link>{" "}
          NZO Industries.
        </p>

        <Button type="submit" variant="primary" loading={isLoading} className="w-full">
          Daftar
        </Button>
      </form>

      <p className="text-center text-sm text-steel-700">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-steel-700 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
