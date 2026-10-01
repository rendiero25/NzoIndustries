"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

type State =
  | { step: "loading" }
  | { step: "enroll"; factorId: string; qrCode: string; secret: string }
  | { step: "challenge"; factorId: string }
  | { step: "error" };

/**
 * TOTP wajib untuk staf (security rule 7).
 * Belum punya factor terverifikasi: daftar (QR + secret) lalu verifikasi.
 * Sudah punya: masukkan kode 6 digit dari aplikasi authenticator.
 */
export function MfaForm() {
  const [state, setState] = useState<State>({ step: "loading" });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) {
        setState({ step: "error" });
        return;
      }

      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setState({ step: "challenge", factorId: verified.id });
        return;
      }

      // Bersihkan pendaftaran lama yang tidak selesai, lalu daftar ulang.
      for (const factor of data.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const enrolled = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "NZO Admin",
      });
      if (cancelled) return;
      if (enrolled.error) {
        setState({ step: "error" });
        return;
      }
      setState({
        step: "enroll",
        factorId: enrolled.data.id,
        qrCode: enrolled.data.totp.qr_code,
        secret: enrolled.data.totp.secret,
      });
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function verify() {
    if (state.step !== "enroll" && state.step !== "challenge") return;
    if (!/^\d{6}$/.test(code)) {
      toast.error("Masukkan 6 digit kode dari aplikasi authenticator.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: state.factorId,
      code,
    });
    setSubmitting(false);

    if (error) {
      setCode("");
      toast.error(
        error.status === 429
          ? "Terlalu banyak percobaan. Tunggu sebentar."
          : "Kode salah atau kedaluwarsa.",
      );
      return;
    }
    toast.success("Verifikasi berhasil.");
    window.location.href = "/admin";
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="inline-flex size-10 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold">Verifikasi dua langkah</h1>
        <p className="text-sm text-muted-foreground">
          {state.step === "enroll"
            ? "Pindai QR dengan aplikasi authenticator (Google Authenticator, Authy, 1Password), lalu masukkan kode 6 digit."
            : "Masukkan kode 6 digit dari aplikasi authenticator Anda."}
        </p>
      </div>

      {state.step === "loading" && <Skeleton className="h-48 w-full" />}

      {state.step === "error" && (
        <p className="text-sm text-destructive" role="alert">
          Gagal memuat verifikasi dua langkah. Muat ulang halaman atau masuk kembali.
        </p>
      )}

      {state.step === "enroll" && (
        <div className="space-y-3">
          {/* qr_code dari Supabase berupa data URI SVG */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.qrCode}
            alt="QR code untuk aplikasi authenticator"
            width={192}
            height={192}
            className="mx-auto size-48 rounded-md border bg-white p-2"
          />
          <p className="text-center text-xs text-muted-foreground">
            Tidak bisa memindai? Masukkan kunci ini secara manual:
            <code className="mt-1 block font-mono break-all text-foreground select-all">
              {state.secret}
            </code>
          </p>
        </div>
      )}

      {(state.step === "enroll" || state.step === "challenge") && (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
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
            className="w-full"
            loading={submitting}
            disabled={code.length !== 6}
          >
            Verifikasi
          </Button>
        </form>
      )}

      <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>
        Keluar
      </Button>
    </div>
  );
}
