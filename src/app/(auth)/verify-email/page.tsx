"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

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
      const res = await fetch("/api/auth/resend-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = (await res.json()) as { success: boolean; error?: string };

      if (!json.success) {
        toast.error(json.error ?? "Gagal kirim ulang. Coba lagi.");
        return;
      }

      toast.success("Email aktivasi berhasil dikirim ulang. Cek inbox kamu.");
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EA5329]/10">
        <MailCheck className="text-[#EA5329]" size={28} />
      </div>

      <div className="space-y-3">
        <h1 className="text-[28px] leading-[1.14] font-semibold text-[#1d1d1f]">Cek Email Kamu!</h1>
        <p className="text-[17px] leading-[1.47] font-normal text-[#1d1d1f]">
          Kami sudah kirim email sambutan sekaligus link aktivasi ke{" "}
          {email ? <span className="font-semibold">{email}</span> : "alamat emailmu"}.
        </p>
        <p className="text-[15px] leading-[1.6] font-normal text-[#1d1d1f]">
          Klik tombol <span className="font-semibold">&ldquo;Aktifkan Akun&rdquo;</span> di email
          tersebut untuk mulai belanja di NZO Industries.
        </p>
        <p className="text-[14px] leading-[1.43] font-normal text-[#7a7a7a]">
          Tidak menerima email? Cek folder{" "}
          <span className="font-semibold text-[#1d1d1f]">Spam</span> atau klik tombol di bawah untuk
          kirim ulang.
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
