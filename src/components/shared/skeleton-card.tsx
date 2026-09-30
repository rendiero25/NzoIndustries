import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("flex flex-col border border-foreground", className)}>
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-16 animate-pulse bg-muted" />
        <div className="h-4 w-full animate-pulse bg-muted" />
        <div className="h-4 w-2/3 animate-pulse bg-muted" />
        <div className="mt-1 h-6 w-28 animate-pulse bg-muted" />
      </div>
    </div>
  );
}
