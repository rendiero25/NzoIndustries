import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Wordmark sementara NZO Industries (logo resmi menunggu klien). Dirender
 * sebagai teks Outfit agar tajam di semua ukuran dan bisa dibalik warnanya
 * di latar gelap. Ganti isi komponen ini saat file logo tersedia.
 */
const sizeClass = {
  navbar: "gap-1.5 [--nzo-main:1.5rem] [--nzo-sub:0.625rem]",
  footer: "gap-2 [--nzo-main:1.875rem] [--nzo-sub:0.6875rem]",
  adminSidebar: "gap-1.5 [--nzo-main:1.25rem] [--nzo-sub:0.5625rem]",
  adminTopbar: "gap-1.5 [--nzo-main:1.125rem] [--nzo-sub:0.5rem]",
  authPanel: "gap-2 [--nzo-main:2rem] [--nzo-sub:0.75rem]",
  authMobile: "gap-1.5 [--nzo-main:1.5rem] [--nzo-sub:0.625rem]",
  adminLogin: "gap-1.5 [--nzo-main:1.625rem] [--nzo-sub:0.6875rem]",
  maintenance: "mx-auto gap-2 [--nzo-main:2.25rem] [--nzo-sub:0.75rem]",
  shippingLabel: "gap-1.5 [--nzo-main:1.375rem] [--nzo-sub:0.625rem]",
} as const;

export type SiteLogoVariant = keyof typeof sizeClass;

type SiteLogoProps = {
  /** Default `/`; panel admin memakai `/admin`. */
  href?: string;
  variant?: SiteLogoVariant;
  /** `light` untuk latar hitam/asphalt. */
  tone?: "dark" | "light";
  className?: string;
  /** Tanpa link (mis. halaman maintenance, dokumen cetak). */
  asStatic?: boolean;
  /** @deprecated tidak dipakai lagi (wordmark berupa teks). */
  priority?: boolean;
  ariaLabel?: string;
};

export function SiteLogo({
  href = "/",
  variant = "navbar",
  tone = "dark",
  className,
  asStatic = false,
  ariaLabel = "NZO Industries, ke beranda",
}: SiteLogoProps) {
  const mark = (
    <>
      <span
        aria-hidden="true"
        className="text-(length:--nzo-main) leading-none font-extrabold tracking-[-0.04em]"
      >
        NZO
      </span>
      <span
        aria-hidden="true"
        className="text-(length:--nzo-sub) leading-none font-semibold tracking-[0.22em] uppercase"
      >
        Industries
      </span>
    </>
  );

  const box = cn(
    "inline-flex shrink-0 items-baseline whitespace-nowrap select-none",
    tone === "light" ? "text-white" : "text-foreground",
    sizeClass[variant],
    className,
  );

  if (asStatic) {
    return (
      <span className={box} role="img" aria-label="NZO Industries">
        {mark}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(box, "rounded-sm")} aria-label={ariaLabel}>
      {mark}
    </Link>
  );
}
