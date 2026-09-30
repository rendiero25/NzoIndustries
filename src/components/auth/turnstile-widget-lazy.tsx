"use client";

import dynamic from "next/dynamic";

import { isTurnstileRequired } from "@/lib/auth/turnstile-config";

const TurnstileWidget = dynamic(
  () =>
    import("@/components/auth/turnstile-widget").then((m) => ({
      default: m.TurnstileWidget,
    })),
  { ssr: false },
);

type TurnstileWidgetLazyProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
};

/** Muat script Cloudflare Turnstile hanya setelah hydration (bundle-defer-third-party). */
export function TurnstileWidgetLazy(props: TurnstileWidgetLazyProps) {
  if (!isTurnstileRequired()) return null;
  return <TurnstileWidget {...props} />;
}
