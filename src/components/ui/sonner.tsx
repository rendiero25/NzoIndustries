"use client"

import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"

const toasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--toast-border)",
  "--border-radius": "var(--radius-lg)",
} as CSSProperties

const iconProps = { className: "size-4", strokeWidth: 1.75 }

/**
 * design-system.md §9: bawah-tengah di mobile, kanan-bawah di desktop,
 * 4 detik (error 6 detik), varian success/error/info/loading.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)", true)

  return (
    <Sonner
      theme="light"
      className="toaster group"
      position={isDesktop ? "bottom-right" : "bottom-center"}
      duration={4000}
      icons={{
        success: <CircleCheckIcon {...iconProps} className="size-4 text-success" />,
        info: <InfoIcon {...iconProps} />,
        warning: <TriangleAlertIcon {...iconProps} className="size-4 text-warning" />,
        error: <OctagonXIcon {...iconProps} className="size-4 text-danger" />,
        loading: <Loader2Icon {...iconProps} className="size-4 animate-spin" />,
      }}
      style={toasterStyle}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          error: "cn-toast-error",
          description: "cn-toast-description",
          actionButton: "cn-toast-action",
          cancelButton: "cn-toast-cancel",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
