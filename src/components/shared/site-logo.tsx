import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Logo resmi NZO Industries (perisai + wordmark), di-trace dari `public/logo.png`
 * ke `public/brand/nzo-lockup.svg`. Dirender sebagai CSS mask di atas
 * `bg-current` supaya warnanya ikut `tone` (hitam di latar terang, putih di
 * latar gelap) tanpa menyisipkan path SVG besar ke setiap halaman.
 */
const LOCKUP_RATIO = 3204 / 1328;

const heightClass = {
  navbar: "h-8",
  footer: "h-11",
  adminSidebar: "h-7",
  adminTopbar: "h-6",
  authPanel: "h-12",
  authMobile: "h-8",
  adminLogin: "h-10",
  maintenance: "mx-auto h-14",
  shippingLabel: "h-8",
} as const;

export type SiteLogoVariant = keyof typeof heightClass;

type SiteLogoProps = {
  /** Default `/`; panel admin memakai `/admin`. */
  href?: string;
  variant?: SiteLogoVariant;
  /** `light` untuk latar hitam/asphalt. */
  tone?: "dark" | "light";
  className?: string;
  /** Tanpa link (mis. halaman maintenance, dokumen cetak). */
  asStatic?: boolean;
  /** @deprecated tidak dipakai lagi (logo berupa mask SVG). */
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
    <span
      aria-hidden="true"
      className="block h-full bg-current [mask:url(/brand/nzo-lockup.svg)_center/contain_no-repeat] [print-color-adjust:exact]"
      style={{ aspectRatio: LOCKUP_RATIO }}
    />
  );

  const box = cn(
    "inline-flex shrink-0 select-none",
    tone === "light" ? "text-white" : "text-foreground",
    heightClass[variant],
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
