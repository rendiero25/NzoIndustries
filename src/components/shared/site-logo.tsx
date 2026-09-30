import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const variantClass = {
  navbar: "h-7 w-[9.5rem] sm:h-8 sm:w-[11.5rem]",
  footer: "h-10 w-[13rem] sm:w-[15rem]",
  adminSidebar: "h-8 w-[9.5rem]",
  adminTopbar: "h-6 w-[7.25rem]",
  authPanel: "h-10 w-[14rem] max-w-full",
  authMobile: "h-8 w-[11rem]",
  adminLogin: "h-9 w-[12rem]",
  maintenance: "h-11 w-[16rem] sm:h-12 sm:w-[18rem] mx-auto",
  shippingLabel: "h-7 w-[9.5rem]",
} as const;

export type SiteLogoVariant = keyof typeof variantClass;

type SiteLogoProps = {
  /** Default `/` kecuali panel admin memakai `/admin` */
  href?: string;
  variant?: SiteLogoVariant;
  className?: string;
  /** Tanpa link (mis. halaman maintenance) */
  asStatic?: boolean;
  priority?: boolean;
  /** Override `aria-label` pada link */
  ariaLabel?: string;
};

export function SiteLogo({
  href = "/",
  variant = "navbar",
  className,
  asStatic = false,
  priority = false,
  ariaLabel = "NZO Industries — Beranda",
}: SiteLogoProps) {
  const box = cn("relative block shrink-0", variantClass[variant], className);

  const image = (
    <Image
      src="/logo.svg"
      unoptimized
      alt="NZO Industries"
      fill
      className={cn("object-contain", variant === "maintenance" ? "object-center" : "object-left")}
      sizes="(max-width: 640px) 200px, 280px"
      priority={priority}
    />
  );

  if (asStatic) {
    return <div className={box}>{image}</div>;
  }

  return (
    <Link href={href} className={box} aria-label={ariaLabel}>
      {image}
    </Link>
  );
}
