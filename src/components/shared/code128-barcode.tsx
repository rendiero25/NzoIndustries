import { CODE128_QUIET_ZONE_MODULES, encodeCode128 } from "@/lib/barcode/code128";
import { cn } from "@/lib/utils";

type Code128BarcodeProps = {
  value: string;
  /** Tinggi bar dalam satuan viewBox (lebar 1 modul = 1). */
  barHeight?: number;
  className?: string;
};

/** Barcode Code 128 sebagai SVG murni (bisa dirender di server, tajam saat dicetak). */
export function Code128Barcode({ value, barHeight = 50, className }: Code128BarcodeProps) {
  const widths = encodeCode128(value);
  const totalModules = widths.reduce((sum, w) => sum + w, 0) + CODE128_QUIET_ZONE_MODULES * 2;

  const bars: { x: number; w: number }[] = [];
  let x = CODE128_QUIET_ZONE_MODULES;
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });

  return (
    <svg
      viewBox={`0 0 ${totalModules} ${barHeight}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Barcode ${value}`}
      className={cn("block", className)}
    >
      <rect width={totalModules} height={barHeight} className="fill-white" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={barHeight} className="fill-black" />
      ))}
    </svg>
  );
}
