"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";

import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordVisibilityToggle } from "@/components/ui/password-visibility-toggle";
import { SiteLogo } from "@/components/shared/site-logo";
import { TurnstileWidgetLazy } from "@/components/auth/turnstile-widget-lazy";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";
import { adminSignInAction } from "@/server/actions/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

function AdminLoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const searchParams = useSearchParams();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "not_admin") {
      toast.error("Akses ditolak. Akun ini bukan staf.");
    } else if (err === "blocked") {
      toast.error("Akun ini diblokir. Hubungi owner toko.");
    }
  }, [searchParams]);

  const onSubmit = async (values: LoginFormValues) => {
    if (isTurnstileRequired() && !turnstileToken) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminSignInAction({
        email: values.email,
        password: values.password,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        resetTurnstile();
        return;
      }
      // /admin/mfa hanya bila MFA staf diwajibkan (D-20).
      window.location.href = result.next;
    } catch {
      toast.error("Terjadi kesalahan tidak terduga. Coba lagi.");
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-svh flex-col bg-steel-50">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
        <SiteLogo variant="adminLogin" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-steel-700 hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Ke toko
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-sm bg-muted px-2 py-1 text-caption font-medium text-steel-700">
              <Lock className="size-3.5" strokeWidth={1.75} />
              Khusus staf
            </span>
            <h1 className="text-[1.75rem] leading-9">Masuk ke panel admin</h1>
            <p className="text-sm text-muted-foreground">
              Pakai email dan kata sandi akun staf kamu.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="nama@nzo-industries.test"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Kata sandi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          className="h-11 pr-11"
                          {...field}
                        />
                        <PasswordVisibilityToggle
                          visible={showPassword}
                          onToggle={() => setShowPassword((v) => !v)}
                          className="right-1.5"
                          labelVisible="Tampilkan kata sandi"
                          labelHidden="Sembunyikan kata sandi"
                          iconSize={16}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TurnstileWidgetLazy
                key={turnstileKey}
                onVerify={handleTurnstileVerify}
                onExpire={() => setTurnstileToken(null)}
              />

              <Button type="submit" loading={isLoading} className="mt-1 w-full">
                Masuk
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
