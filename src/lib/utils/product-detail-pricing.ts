import type { ProductDetailVariant } from "@/lib/types/product-detail";

/** Harga tampilan per varian: sale produk vs max(base, harga varian) — selaras kartu shelf. */
export function computeVariantUnitPrice(args: {
  basePrice: number;
  salePrice: number | null;
  variantPrice: number;
}): { listPrice: number; unitPrice: number; discountPercent: number | null } {
  const list = Math.max(args.basePrice, args.variantPrice);
  const saleNum = args.salePrice != null ? Number(args.salePrice) : null;
  const hasSale = saleNum != null && saleNum > 0 && saleNum < list;
  const unitPrice = hasSale ? saleNum : list;
  const discountPercent = hasSale ? Math.round((1 - unitPrice / list) * 100) : null;
  return { listPrice: list, unitPrice, discountPercent };
}

/** Varian default: harga satuan terendah (selaras kartu shelf). */
export function pickDefaultVariantId(
  variants: ProductDetailVariant[],
  basePrice: number,
  salePrice: number | null,
): string | null {
  if (variants.length === 0) return null;
  let best = variants[0];
  let bestUnit = computeVariantUnitPrice({
    basePrice,
    salePrice,
    variantPrice: best.price,
  }).unitPrice;
  for (const v of variants.slice(1)) {
    const u = computeVariantUnitPrice({ basePrice, salePrice, variantPrice: v.price }).unitPrice;
    if (u < bestUnit) {
      best = v;
      bestUnit = u;
    }
  }
  return best.id;
}
