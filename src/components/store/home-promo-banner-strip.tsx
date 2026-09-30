import Link from "next/link";

import {
  STORE_BANNER_IMAGE_CLASS,
  STORE_BANNER_MEDIA_CLASS,
  STORE_BANNER_SURFACE_CLASS,
} from "@/lib/constants/store-banner";
import type { StoreBanner } from "@/lib/data/home-storefront";
import { cn } from "@/lib/utils";

type HomePromoBannerStripProps = {
  banners: StoreBanner[];
  className?: string;
};

export function HomePromoBannerStrip({ banners, className }: HomePromoBannerStripProps) {
  if (banners.length === 0) return null;
  return (
    <div className={cn("mb-6 w-full space-y-3", className)}>
      {banners.map((b) => {
        const img = (
          <div className={cn(STORE_BANNER_MEDIA_CLASS, "h-[230px] sm:h-[390px]", "bg-neutral-100")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image_url}
              alt={b.title ?? ""}
              className={STORE_BANNER_IMAGE_CLASS}
              loading="lazy"
              decoding="async"
            />
          </div>
        );
        return (
          <div
            key={b.id}
            className={cn("w-full border border-neutral-200", STORE_BANNER_SURFACE_CLASS)}
          >
            {b.link_url ? (
              <Link href={b.link_url} className="block">
                {img}
              </Link>
            ) : (
              img
            )}
          </div>
        );
      })}
    </div>
  );
}
