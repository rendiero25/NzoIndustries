import { cn } from "@/lib/utils";

const CLASSIC_STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

type StarRatingDisplayProps = {
  rating: number;
  max?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
};

const SIZES = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

export function StarRatingDisplay({
  rating,
  max = 5,
  size = "sm",
  className,
}: StarRatingDisplayProps) {
  const filled = Math.round(rating);
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} dari ${max} bintang`}
    >
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={cn(SIZES[size], i < filled ? "text-amber-400" : "text-amber-200")}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d={CLASSIC_STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}
