import { cn } from "@/lib/utils";

type AdminStatusBadgeProps = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  showDot?: boolean;
  className?: string;
};

/** Badge status read-only di tabel admin — aktif memakai aksen brand. */
export function AdminStatusBadge({
  active,
  activeLabel = "Aktif",
  inactiveLabel = "Nonaktif",
  showDot = false,
  className,
}: AdminStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
        active ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {showDot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            active ? "bg-brand" : "bg-muted-foreground/50",
          )}
          aria-hidden
        />
      ) : null}
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
