import { BITESHIP_COURIER_BRANDS } from "@/lib/biteship/courier-brands";

export function CourierLogo({
  code,
  name,
  className = "h-7 w-auto max-w-[72px]",
}: {
  code: string;
  name: string;
  className?: string;
}) {
  const brand = BITESHIP_COURIER_BRANDS.find((b) => b.code === code.toLowerCase());
  if (!brand?.logo) return null;
  return (
    <img
      src={brand.logo}
      alt={name}
      className={`shrink-0 object-contain ${className}`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
