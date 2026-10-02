"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const HIDDEN_ON = ["/checkout"];

/** Glyph WhatsApp sederhana (lucide tidak menyediakan logo merek). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

/**
 * Tombol WhatsApp mengambang (design-system.md §5), semua halaman storefront
 * kecuali checkout. Nomor dari NEXT_PUBLIC_WHATSAPP_NUMBER; tidak tampil bila kosong.
 */
export function WhatsAppButton({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

  if (!number || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Tanya lewat WhatsApp"
      className={cn(
        "fixed right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-40 md:right-6 md:bottom-6",
        "group flex h-12 items-center gap-2 rounded-full bg-primary pr-4 pl-3 text-primary-foreground",
        "shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] transition-transform duration-200 ease-out-nzo motion-safe:hover:-translate-y-0.5",
        className,
      )}
    >
      <WhatsAppGlyph className="size-6" />
      <span className="text-sm font-semibold">Tanya CS</span>
    </a>
  );
}
