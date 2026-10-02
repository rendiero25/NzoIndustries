import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * Tombol NZO (design-system.md §2, §4, §8).
 * - primary: hitam solid, aksi utama
 * - secondary: outline hitam
 * - signal: fill amber + teks hitam, hanya untuk satu CTA promo per viewport
 * - ghost / link / destructive*: aksi sekunder & destruktif
 * Nama varian lama (dark, pearl, hero, icon-chip, table-action*, default,
 * outline) dipertahankan agar halaman starter tetap jalan.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border font-semibold whitespace-nowrap outline-none select-none",
    "transition-[transform,background-color,color,border-color,opacity] duration-200 ease-out-nzo",
    "active:not-disabled:scale-[0.97] active:duration-100 motion-reduce:active:scale-100",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary text-primary-foreground hover:bg-steel-700 dark:hover:bg-steel-200",
        secondary: "border-foreground bg-transparent text-foreground hover:bg-muted",
        signal: "border-transparent bg-signal text-brand-black hover:bg-signal-hover",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
        destructive: "border-transparent bg-destructive text-white hover:bg-destructive/90",
        "destructive-ghost":
          "border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10",
        link: "h-auto min-h-0 rounded-none border-transparent bg-transparent p-0 font-medium text-foreground underline-offset-4 hover:underline active:scale-100",
        "icon-chip": "rounded-full border-border bg-background/90 text-foreground hover:bg-background",
        "table-action": "border-border bg-transparent font-medium text-foreground hover:bg-muted",
        "table-action-brand": "border-foreground bg-transparent font-medium text-foreground hover:bg-muted",
        "table-action-destructive":
          "border-destructive/40 bg-transparent font-medium text-destructive hover:bg-destructive/10",
        /** @deprecated pakai `primary` */
        dark: "border-transparent bg-primary text-primary-foreground hover:bg-steel-700",
        /** @deprecated pakai `ghost` */
        pearl: "border-border bg-muted text-foreground hover:bg-steel-200",
        /** @deprecated pakai `primary` size lg */
        hero: "border-transparent bg-primary text-primary-foreground hover:bg-steel-700",
        /** @deprecated pakai `primary` */
        default: "border-transparent bg-primary text-primary-foreground hover:bg-steel-700",
        /** @deprecated pakai `secondary` */
        outline: "border-foreground bg-transparent text-foreground hover:bg-muted",
      },
      size: {
        default: "min-h-11 px-5 py-2.5 text-[0.9375rem] leading-5",
        sm: "min-h-9 px-3.5 py-2 text-sm leading-5",
        xs: "min-h-8 gap-1 px-2.5 py-1 text-xs leading-4",
        lg: "min-h-12 px-6 py-3 text-base leading-6",
        icon: "size-11 min-h-0 rounded-full p-0",
        "icon-sm": "size-9 min-h-0 rounded-full p-0",
      },
    },
    compoundVariants: [
      { variant: "link", size: ["default", "sm", "xs", "lg"], class: "min-h-0 px-0 py-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>

function resolveVariant(variant: VariantProps<typeof buttonVariants>["variant"]): ButtonVariant {
  if (!variant || variant === "default" || variant === "dark" || variant === "hero") return "primary"
  if (variant === "outline") return "secondary"
  return variant
}

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Spinner kecil + nonaktif saat proses (design-system.md §9). */
    loading?: boolean
  }

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const resolved = resolveVariant(variant)
  const isDisabled = disabled || loading

  return (
    <Comp
      data-slot="button"
      data-variant={resolved}
      data-size={size}
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : isDisabled}
      className={cn(buttonVariants({ variant: resolved, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner data-icon="inline-start" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants, resolveVariant }
