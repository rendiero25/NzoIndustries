"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resendActivationAction } from "@/server/actions/auth";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email tidak ditemukan. Coba daftar ulang.");
      return;
    }

    setIsResending(true);
    try {
      const result = await resendActivationAction({ email });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Jika email terdaftar dan belum aktif, link aktivasi baru sudah dikirim.");
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="text-foreground" size={28} />
      </div>

      <div className="space-y-3">
        <h1 className="text-[28px] leading-[1.14] font-semibold text-foreground">
          Cek Email Kamu!
        </h1>
        <p className="text-base leading-[1.47] font-normal text-foreground">
          Kami sudah kirim email sambutan sekaligus link aktivasi ke{" "}
          {email ? <span className="font-semibold">{email}</span> : "alamat emailmu"}.
        </p>
        <p className="text-[15px] leading-[1.6] font-normal text-foreground">
          Klik tombol <span className="font-semibold">&ldquo;Aktifkan Akun&rdquo;</span> di email
          tersebut untuk mulai belanja di NZO Industries.
        </p>
        <p className="text-[14px] leading-[1.43] font-normal text-muted-foreground">
          Tidak menerima email? Cek folder{" "}
          <span className="font-semibold text-foreground">Spam</span> atau klik tombol di bawah
          untuk kirim ulang.
        </p>
      </div>

      <div className="space-y-3">
        {email && (
          <Button
            type="button"
            variant="primary"
            onClick={handleResend}
            loading={isResending}
            className="w-full"
          >
            Kirim ulang email aktivasi
          </Button>
        )}

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
