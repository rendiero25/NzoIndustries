import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Panel shell — selaras dropdown notifikasi (rounded 18px, hairline, shadow-md). */
export const HEADER_DROPDOWN_PANEL_CLASS =
  "overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white shadow-md";

export const HEADER_DROPDOWN_MENU_CONTENT_CLASS = cn(HEADER_DROPDOWN_PANEL_CLASS, "gap-0 p-0");

type HeaderDropdownPanelHeaderProps = {
  title: string;
  badge?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function HeaderDropdownPanelHeader({
  title,
  badge,
  trailing,
  className,
}: HeaderDropdownPanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b border-black/10 bg-[#2a2a2c] px-4 py-3 text-white",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[14px] leading-[1.29] font-semibold">{title}</span>
        {badge}
      </div>
      {trailing}
    </div>
  );
}

type HeaderDropdownPanelBodyProps = {
  children: ReactNode;
  className?: string;
};

export function HeaderDropdownPanelBody({ children, className }: HeaderDropdownPanelBodyProps) {
  return <div className={cn("bg-white", className)}>{children}</div>;
}

export const HEADER_DROPDOWN_MENU_ITEM_CLASS =
  "cursor-pointer rounded-none px-4 py-2.5 text-[14px] leading-[1.43] text-[#1d1d1f] focus:bg-transparent focus:text-[#EA5329] focus:[&_svg]:!text-[#EA5329]";
