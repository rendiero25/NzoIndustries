import { Wrench } from "lucide-react";

import { SiteLogo } from "@/components/shared/site-logo";

export function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      {/* Logo */}
      <div className="mb-10">
        <SiteLogo variant="maintenance" asStatic />
      </div>

      {/* Icon */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center border-2 border-white/20">
        <Wrench size={32} className="text-foreground" />
      </div>

      {/* Content */}
      <h1 className="text-swiss-heading mb-4 text-white">
        Sedang Dalam
        <br />
        <span className="text-foreground">Pemeliharaan</span>
      </h1>

      <p className="mb-8 max-w-sm text-sm leading-relaxed text-white/60">
        Website NZO Industries sedang dalam pemeliharaan untuk meningkatkan layanan. Kami akan
        segera kembali. Terima kasih atas kesabaran Anda.
      </p>

      {/* Divider Swiss */}
      <div className="mb-8 h-px w-16 bg-primary" />

      {/* Contact */}
      <p className="text-xs text-white/40">
        Butuh bantuan mendesak?{" "}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
          className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
        >
          Hubungi kami via WhatsApp
        </a>
      </p>
    </div>
  );
}
