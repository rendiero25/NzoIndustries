import { Badge } from "@/components/ui/badge";

type Props = {
  count: number;
};

export function SidebarNotificationBadge({ count }: Props) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : count;

  return (
    <Badge
      variant="brand"
      aria-label={`${label} belum dibaca`}
      className="ml-auto min-w-5 px-1 text-[10px] font-bold tabular-nums"
    >
      {label}
    </Badge>
  );
}
