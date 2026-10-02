"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

type AnnouncementBarProps = {
  /** id banner: penutupan diingat per banner, banner baru muncul lagi. */
  id: string;
  text: string;
  link?: string;
};

const KEY_PREFIX = "nzo-promo-dismissed:";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function isDismissed(id: string) {
  try {
    return sessionStorage.getItem(KEY_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

/** Bar promo signal-soft, bisa ditutup (design-system.md §2, §5). */
export function AnnouncementBar({ id, text, link }: AnnouncementBarProps) {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => isDismissed(id),
    () => false,
  );

  if (dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(KEY_PREFIX + id, "1");
    } catch {
      // storage diblokir: tutup untuk render ini saja
    }
    listeners.forEach((l) => l());
  }

  const isInternal = link?.startsWith("/");

  return (
    <div className="relative bg-signal-soft text-brand-black">
      <div className="nzo-container flex min-h-10 items-center justify-center py-2 pr-10 text-center text-sm">
        {link ? (
          isInternal ? (
            <Link href={link} className="font-medium underline-offset-4 hover:underline">
              {text}
            </Link>
          ) : (
            <a
              href={link}
              className="font-medium underline-offset-4 hover:underline"
              rel="noopener noreferrer"
            >
              {text}
            </a>
          )
        ) : (
          <span className="font-medium">{text}</span>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup info promo"
        className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-black/5"
      >
        <X className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
