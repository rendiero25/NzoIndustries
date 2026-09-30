"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const contactFormSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .regex(/^(\+62|0)[0-9]{9,}$/, "Format nomor telepon tidak valid"),
  subject: z.string().min(5, "Subjek minimal 5 karakter").max(100, "Subjek maksimal 100 karakter"),
  message: z
    .string()
    .min(10, "Pesan minimal 10 karakter")
    .max(2000, "Pesan maksimal 2000 karakter"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setSubmitError(payload?.error ?? "Gagal mengirim pesan. Coba lagi nanti.");
        return;
      }

      setSubmitted(true);
      reset();
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      setSubmitError("Gagal mengirim pesan. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#f5f5f7][#2a2a2c] rounded-[18px] p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h3 className="mb-2 text-[17px] font-semibold text-[#1d1d1f]">Pesan terkirim!</h3>
        <p className="text-[#7a7a7a][#cccccc] text-[14px]">
          Terima kasih telah menghubungi kami. Tim kami akan merespon dalam waktu singkat.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className="mb-2 block text-[14px] font-semibold text-[#1d1d1f]">
          Nama Lengkap
        </label>
        <input
          id="name"
          type="text"
          placeholder="John Doe"
          {...register("name")}
          className="border-[#e0e0e0][#3a3a3a] bg-white[#1a1a1a] w-full rounded-[11px] border px-4 py-3 text-[14px] text-[#1d1d1f] transition-colors focus:border-[#EA5329] focus:outline-none"
        />
        {errors.name && <p className="mt-1 text-[12px] text-[#d32f2f]">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-2 block text-[14px] font-semibold text-[#1d1d1f]">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="john@example.com"
          {...register("email")}
          className="border-[#e0e0e0][#3a3a3a] bg-white[#1a1a1a] w-full rounded-[11px] border px-4 py-3 text-[14px] text-[#1d1d1f] transition-colors focus:border-[#EA5329] focus:outline-none"
        />
        {errors.email && <p className="mt-1 text-[12px] text-[#d32f2f]">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="mb-2 block text-[14px] font-semibold text-[#1d1d1f]">
          Nomor Telepon
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="08123456789 atau +62123456789"
          {...register("phone")}
          className="border-[#e0e0e0][#3a3a3a] bg-white[#1a1a1a] w-full rounded-[11px] border px-4 py-3 text-[14px] text-[#1d1d1f] transition-colors focus:border-[#EA5329] focus:outline-none"
        />
        {errors.phone && <p className="mt-1 text-[12px] text-[#d32f2f]">{errors.phone.message}</p>}
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="mb-2 block text-[14px] font-semibold text-[#1d1d1f]">
          Subjek
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Konsultasi produk, pertanyaan pesanan, dll"
          {...register("subject")}
          className="border-[#e0e0e0][#3a3a3a] bg-white[#1a1a1a] w-full rounded-[11px] border px-4 py-3 text-[14px] text-[#1d1d1f] transition-colors focus:border-[#EA5329] focus:outline-none"
        />
        {errors.subject && (
          <p className="mt-1 text-[12px] text-[#d32f2f]">{errors.subject.message}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="mb-2 block text-[14px] font-semibold text-[#1d1d1f]">
          Pesan
        </label>
        <textarea
          id="message"
          placeholder="Tulis pesan detailmu di sini..."
          rows={5}
          {...register("message")}
          className="border-[#e0e0e0][#3a3a3a] bg-white[#1a1a1a] w-full resize-none rounded-[11px] border px-4 py-3 text-[14px] text-[#1d1d1f] transition-colors focus:border-[#EA5329] focus:outline-none"
        />
        {errors.message && (
          <p className="mt-1 text-[12px] text-[#d32f2f]">{errors.message.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="primary" loading={isLoading} className="w-full">
        Kirim Pesan
      </Button>

      {submitError && (
        <p role="alert" className="text-center text-[12px] text-[#d32f2f]">
          {submitError}
        </p>
      )}

      <p className="text-[#7a7a7a][#cccccc] text-center text-[12px]">
        Kami akan merespon dalam waktu 1-24 jam kerja.
      </p>
    </form>
  );
}
