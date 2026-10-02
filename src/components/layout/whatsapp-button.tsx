"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const WHATSAPP_ADMIN_URL = "https://wa.me/6281992283947";

export function WhatsAppButton({ className }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_ADMIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp admin"
      className={cn(
        "fixed right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-50 md:right-6 md:bottom-6",
        "flex size-14 items-center justify-center overflow-hidden rounded-full",
        "bg-[#25D366] shadow-[0_12px_28px_rgba(37,211,102,0.28)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:bg-success hover:shadow-[0_16px_32px_rgba(37,211,102,0.34)]",
        "focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:outline-none",
        className,
      )}
    >
      <Image
        src="/whatsapp.webp"
        alt=""
        width={72}
        height={72}
        className="size-[72px] max-w-none object-contain"
      />
    </a>
  );
}
