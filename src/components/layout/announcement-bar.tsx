"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type AnnouncementBarProps = {
  text: string;
  link?: string;
};

const STORAGE_KEY = "nzo-announcement-dismissed";

export function AnnouncementBar({ text, link }: AnnouncementBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const content = <span className="text-xs font-medium sm:text-sm">{text}</span>;

  return (
    <div
      role="banner"
      className="gap-3[#000000] relative flex items-center justify-center bg-black px-4 py-2 text-white"
    >
      <div className="flex items-center gap-2 text-center">
        {link ? (
          <a href={link} className="transition-swiss underline-offset-2 hover:underline">
            {content}
          </a>
        ) : (
          content
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        aria-label="Tutup pengumuman"
        className="absolute top-1/2 right-3 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
