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
    <div className="flex min-h-screen">
      {/* ── Panel ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            <SiteLogo variant="adminLogin" />
          </div>

          {/* Header */}
          <div className="mb-9">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#EA5329]/20 bg-[#EA5329]/6 px-3 py-1.5">
              <Lock className="h-3 w-3 text-[#EA5329]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold tracking-[0.14em] text-[#EA5329] uppercase">
                Akses Terbatas
              </span>
            </div>

            <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.374px] text-[#1d1d1f]">
              Masuk ke
              <br />
              Admin Panel
            </h1>
            <p className="mt-2.5 text-[14px] leading-[1.47] text-[#7a7a7a]">
              Gunakan email dan password administrator Anda.
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7" noValidate>
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-[10px] font-bold tracking-[0.12em] text-[#a0a0a0] uppercase">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="admin@nzo-industries.test"
                        className="h-11 rounded-none border-x-0 border-t-0 border-b-2 border-[#e0e0e0] bg-transparent px-0 text-[15px] shadow-none placeholder:text-[#c8c8c8] focus-visible:border-[#1d1d1f] focus-visible:ring-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-[10px] font-bold tracking-[0.12em] text-[#a0a0a0] uppercase">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="h-11 rounded-none border-x-0 border-t-0 border-b-2 border-[#e0e0e0] bg-transparent px-0 pr-10 text-[15px] shadow-none placeholder:text-[#c8c8c8] focus-visible:border-[#1d1d1f] focus-visible:ring-0"
                          {...field}
                        />
                        <PasswordVisibilityToggle
                          visible={showPassword}
                          onToggle={() => setShowPassword((v) => !v)}
                          className="right-0"
                          labelVisible="Tampilkan password"
                          labelHidden="Sembunyikan password"
                          iconSize={15}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />

              <TurnstileWidgetLazy
                key={turnstileKey}
                onVerify={handleTurnstileVerify}
                onExpire={() => setTurnstileToken(null)}
              />

              {/* Submit */}
              <Button
                type="submit"
                loading={isLoading}
                className="h-11 w-full rounded-none bg-[#1d1d1f] text-[14px] font-semibold tracking-[-0.224px] text-white hover:bg-[#2a2a2c] active:scale-[0.98]"
              >
                Masuk ke Admin Panel
              </Button>
            </form>
          </Form>

          {/* Footer */}
          <div className="mt-8 border-t border-[#f0f0f0] pt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#7a7a7a] transition-colors hover:text-[#1d1d1f]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke website
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
