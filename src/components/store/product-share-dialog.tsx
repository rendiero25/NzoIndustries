"use client";

import { useState } from "react";
import { Check, Link } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Brand icons ───────────────────────────────────────────────────────────

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.848L1.254 2.25H8.08l4.259 5.627L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function IconThreads({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.868 1.202 8.725.024 12.007 0h.013c2.523.026 4.819.676 6.822 1.932 1.978 1.241 3.365 2.98 4.12 5.163l-2.498.88c-.578-1.608-1.63-2.941-3.127-3.961-1.508-.999-3.307-1.52-5.342-1.543-2.657.033-4.758.953-6.244 2.736C4.338 6.919 3.559 9.315 3.528 12c.031 2.685.81 5.08 2.223 6.793 1.486 1.783 3.587 2.703 6.244 2.736 2.33-.028 4.105-.65 5.272-1.85.972-.994 1.477-2.344 1.502-4.01H12v-2.398h9.263c.09.526.137 1.076.137 1.649 0 2.528-.814 4.589-2.422 6.12-1.449 1.379-3.476 2.078-6 2.073-.003-.002-.011 0-.016 0l.007.011.016-.011Z" />
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// ─── Platform config ────────────────────────────────────────────────────────

type SharePlatform = {
  id: string;
  label: string;
  iconBg: string;
  iconColor: string;
  Icon: React.ComponentType<{ className?: string }>;
} & (
  | { type: "link"; href: (url: string, name: string) => string }
  | { type: "copy"; successMsg: string }
);

const PLATFORMS: SharePlatform[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    iconBg: "bg-[#25D366]/12",
    iconColor: "text-[#25D366]",
    Icon: IconWhatsApp,
    type: "link",
    href: (url, name) => `https://wa.me/?text=${encodeURIComponent(`${name}\n${url}`)}`,
  },
  {
    id: "x",
    label: "X",
    iconBg: "bg-neutral-900/8",
    iconColor: "text-neutral-900",
    Icon: IconX,
    type: "link",
    href: (url, name) =>
      `https://x.com/intent/post?text=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "threads",
    label: "Threads",
    iconBg: "bg-neutral-900/8",
    iconColor: "text-neutral-900",
    Icon: IconThreads,
    type: "link",
    href: (url, name) =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(`${name}\n${url}`)}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-600",
    Icon: IconInstagram,
    type: "copy",
    successMsg: "Link disalin! Buka Instagram untuk membagikan.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    iconBg: "bg-neutral-900/8",
    iconColor: "text-neutral-900",
    Icon: IconTikTok,
    type: "copy",
    successMsg: "Link disalin! Buka TikTok untuk membagikan.",
  },
  {
    id: "youtube",
    label: "YouTube",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600",
    Icon: IconYouTube,
    type: "copy",
    successMsg: "Link disalin! Buka YouTube untuk membagikan.",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productUrl: string;
};

export function ProductShareDialog({ open, onOpenChange, productName, productUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Tidak dapat menyalin link.");
    }
  }

  async function handlePlatform(platform: SharePlatform) {
    if (platform.type === "copy") {
      try {
        await navigator.clipboard.writeText(productUrl);
        toast.success(platform.successMsg);
      } catch {
        toast.error("Tidak dapat menyalin link.");
      }
    } else {
      window.open(platform.href(productUrl, productName), "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(24rem,calc(100vw-2rem))] max-w-none overflow-hidden p-0"
      >
        {/* Header — min-w-0 prevents auto grid track from overflowing container */}
        <div className="min-w-0 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Bagikan Produk
            </DialogTitle>
            <p className="mt-0.5 truncate text-[14px] text-muted-foreground">{productName}</p>
          </DialogHeader>
        </div>

        <div className="min-w-0 border-t border-border" />

        {/* Body */}
        <div className="flex min-w-0 flex-col gap-5 px-6 pt-5 pb-6">
          {/* Copy link — primary pill CTA */}
          <button
            type="button"
            onClick={() => void copyLink()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-md px-6 py-[11px]",
              "text-base font-normal transition-transform active:scale-95",
              copied ? "bg-primary text-white" : "bg-primary text-white hover:bg-steel-700",
            )}
          >
            {copied ? (
              <Check className="size-[18px] shrink-0" aria-hidden />
            ) : (
              <Link className="size-[18px] shrink-0" aria-hidden />
            )}
            {copied ? "Link Tersalin!" : "Copy Link"}
          </button>

          {/* Platform section */}
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Bagikan lewat
            </p>
            <div className="grid grid-cols-3 gap-1">
              {PLATFORMS.map((platform) => {
                const { Icon } = platform;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => void handlePlatform(platform)}
                    className="group flex flex-col items-center gap-1.5 rounded-md p-2.5 transition-colors hover:bg-muted active:scale-[0.96]"
                  >
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-[14px] transition-transform group-hover:scale-105",
                        platform.iconBg,
                        platform.iconColor,
                      )}
                    >
                      <Icon className="size-[19px]" />
                    </div>
                    <span className="w-full truncate text-center text-[11px] leading-none text-foreground">
                      {platform.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
