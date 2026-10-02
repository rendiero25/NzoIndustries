import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const STORE_HREF = "/";

export type AuthSplitShellProps = {
  /** Foto panel kiri. Kosong = panel gelap polos (foto brand menunggu klien). */
  imageSrc?: string;
  imagePriority?: boolean;
  leftPanel: React.ReactNode;
  /** Lebar area form, mis. max-w-sm | max-w-md | max-w-lg */
  formMaxWidthClass?: string;
  children: React.ReactNode;
};

/**
 * Layout split auth: panel foto + panel form putih.
 * Tautan toko di sudut atas area gelap — panel putih kanan hanya berisi form.
 */
export function AuthSplitShell({
  imageSrc,
  imagePriority = false,
  leftPanel,
  formMaxWidthClass = "max-w-md",
  children,
}: AuthSplitShellProps) {
  return (
    <div className="relative min-h-screen min-h-svh bg-primary p-3 pt-[max(2.75rem,env(safe-area-inset-top,0px)+0.75rem)] sm:p-4 lg:p-6 lg:pt-6">
      <Link
        href={STORE_HREF}
        className="absolute top-[max(1.25rem,env(safe-area-inset-top,0px)+0.25rem)] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-30 text-[14px] leading-[1.29] font-normal text-foreground transition-colors hover:text-steel-700 active:scale-95 lg:top-15 lg:right-15"
      >
        Kunjungi NZO Industries
      </Link>

      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-[1920px] flex-col gap-3 pt-2 sm:gap-4 sm:pt-0 lg:min-h-[calc(100svh-3rem)] lg:flex-row lg:gap-6 lg:pt-0">
        <div className="relative hidden min-h-0 flex-1 flex-col justify-end overflow-hidden rounded-tr-[1rem] rounded-br-[1rem] lg:flex lg:min-h-[calc(100svh-3rem)]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              className="object-cover object-center"
              sizes="50vw"
              priority={imagePriority}
            />
          ) : (
            <div className="absolute inset-0 bg-primary" aria-hidden="true" />
          )}
          <div className="absolute inset-0" />
          <div className="pointer-events-none relative z-10 p-12 lg:p-16 xl:p-20">{leftPanel}</div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-tl-[1rem] rounded-tr-[1rem] bg-white sm:rounded-tr-none lg:min-h-[calc(100svh-3rem)] lg:rounded-tr-[1rem]">
          <div className="flex flex-col justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-12 lg:py-14">
            <div className={cn("mx-auto w-full", formMaxWidthClass)}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
