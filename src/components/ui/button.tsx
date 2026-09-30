import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * NZO Industries buttons — aligned with .cursor/rules/design.mdc
 * - primary / secondary: pill CTAs (#EA5329)
 * - dark: compact utility (nav Sign In / Bag)
 * - pearl: secondary neutral capsule
 * - hero: store landing CTA (18px / 300)
 * - destructive*: delete flows (outside Apple spec; kept for ecommerce)
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border bg-clip-padding whitespace-nowrap outline-none select-none",
    "transition-[transform,background-color,color,border-color,opacity] duration-[160ms] ease-spring motion-reduce:transition-[background-color,color,border-color,opacity]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52]",
    "motion-safe:active:scale-95 motion-safe:active:duration-[50ms]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "rounded-md border-transparent bg-brand text-brand-foreground shadow-none hover:bg-brand-hover",
        secondary:
          "rounded-md border-brand bg-transparent text-brand shadow-none hover:bg-brand/5",
        dark:
          "rounded-md border-transparent bg-[#1d1d1f] text-white shadow-none hover:bg-[#333333]",
        pearl:
          "rounded-md border-[3px] border-[#f0f0f0] bg-[#fafafc] text-[#333333] shadow-none hover:bg-[#f5f5f7]",
        hero:
          "rounded-md border-transparent bg-brand font-light text-brand-foreground shadow-none hover:bg-brand-hover",
        ghost:
          "rounded-md border-transparent bg-transparent text-foreground shadow-none hover:bg-muted",
        destructive:
          "rounded-md border-transparent bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90",
        "destructive-ghost":
          "rounded-md border-destructive/40 bg-transparent text-destructive shadow-none hover:bg-destructive/10",
        link:
          "h-auto min-h-0 rounded-none border-transparent bg-transparent p-0 text-brand shadow-none hover:underline active:scale-100",
        /** Floating control over photography — design: button-icon-circular */
        "icon-chip":
          "rounded-full border-transparent bg-[rgba(210,210,215,0.64)] text-[#1d1d1f] shadow-none hover:bg-[rgba(210,210,215,0.8)]",
        /** Compact row actions (admin tables) — 14px utility, radius 8px */
        "table-action":
          "rounded-md border-[#e0e0e0] bg-transparent text-foreground shadow-none hover:bg-muted",
        "table-action-brand":
          "rounded-md border-brand/40 bg-transparent text-brand shadow-none hover:bg-brand/5",
        "table-action-destructive":
          "rounded-md border-destructive/40 bg-transparent text-destructive shadow-none hover:bg-destructive/10",
        /** @deprecated Use `primary` */
        default:
          "rounded-md border-transparent bg-brand text-brand-foreground shadow-none hover:bg-brand-hover",
        /** @deprecated Use `secondary` */
        outline:
          "rounded-md border-brand bg-transparent text-brand shadow-none hover:bg-brand/5",
      },
      size: {
        default:
          "min-h-11 px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px]",
        sm: "min-h-9 px-4 py-2 text-sm font-normal leading-[1.29] tracking-[-0.224px]",
        xs: "min-h-8 gap-1 px-3 py-1.5 text-xs font-normal leading-[1.29] tracking-[-0.224px]",
        lg: "min-h-12 px-7 py-3.5 text-lg font-light leading-none tracking-normal",
        icon: "size-11 min-h-0 rounded-full p-0",
        "icon-sm": "size-9 min-h-0 rounded-full p-0",
      },
    },
    compoundVariants: [
      { variant: "link", size: "default", class: "text-[17px] leading-[1.47] tracking-[-0.374px]" },
      { variant: "link", size: "sm", class: "text-sm leading-[1.29] tracking-[-0.224px]" },
      { variant: ["primary", "secondary", "destructive", "default", "outline"], size: "icon", class: "min-h-0 px-0" },
      { variant: ["primary", "secondary", "destructive", "default", "outline"], size: "icon-sm", class: "min-h-0 px-0" },
      { variant: "dark", size: "default", class: "px-[15px] py-2 text-sm leading-[1.29] tracking-[-0.224px]" },
      { variant: "dark", size: "sm", class: "min-h-8 px-[15px] py-2" },
      { variant: "pearl", size: "default", class: "px-[14px] py-2 text-sm leading-[1.43] tracking-[-0.224px]" },
      { variant: "pearl", size: "sm", class: "min-h-8 px-3 py-1.5" },
      { variant: "destructive-ghost", size: "default", class: "min-h-8 px-3 py-2" },
      { variant: "destructive-ghost", size: "sm", class: "min-h-8 px-3 py-1.5" },
      { variant: "icon-chip", size: "icon", class: "min-h-0 px-0" },
      { variant: "icon-chip", size: "icon-sm", class: "min-h-0 px-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function resolveVariant(
  variant: VariantProps<typeof buttonVariants>["variant"]
): NonNullable<VariantProps<typeof buttonVariants>["variant"]> {
  if (!variant || variant === "default") return "primary"
  if (variant === "outline") return "secondary"
  return variant
}

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Tampilkan Spinner shadcn + nonaktifkan tombol (design: Button Spinner). */
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
  const withRipple = !asChild && resolved !== "link"
  const isDisabled = disabled || loading

  const inner = loading ? (
    <>
      <Spinner data-icon="inline-start" />
      {children}
    </>
  ) : (
    children
  )

  return (
    <Comp
      data-slot="button"
      data-variant={resolved}
      data-size={size}
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant: resolved, size, className }),
        withRipple && "relative overflow-hidden",
      )}
      {...props}
    >
      {withRipple ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 scale-0 rounded-[inherit] bg-current opacity-0 transition-[transform,opacity] duration-300 ease-spring group-active/button:scale-150 group-active/button:opacity-[0.12] group-active/button:[transition-duration:50ms] motion-reduce:hidden"
          />
          {inner}
        </>
      ) : (
        inner
      )}
    </Comp>
  )
}

export { Button, buttonVariants, resolveVariant }
