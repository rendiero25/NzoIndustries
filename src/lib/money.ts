/**
 * Uang disimpan sebagai integer rupiah (bigint di DB, number di JS karena
 * nilai toko jauh di bawah Number.MAX_SAFE_INTEGER). Format tampilan id-ID.
 */
const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** 1500000 → "Rp 1.500.000" (spasi biasa, bukan NBSP, agar konsisten). */
export function formatIDR(amount: number): string {
  if (!Number.isFinite(amount)) return "Rp 0";
  return IDR.format(Math.round(amount)).replace(/ /g, " ");
}

/**
 * Persen hemat dibulatkan ke bawah (tidak pernah melebih-lebihkan diskon).
 * null bila tidak ada harga coret yang valid.
 */
export function discountPercent(
  price: number,
  compareAt: number | null | undefined,
): number | null {
  if (compareAt == null || compareAt <= price || compareAt <= 0) return null;
  const pct = Math.floor(((compareAt - price) / compareAt) * 100);
  return pct >= 1 ? pct : null;
}

/** Harga efektif varian (D-18): price varian bila ada, selain itu harga produk. */
export function effectivePrice(
  product: { price: number; compare_at_price: number | null },
  variant?: { price: number | null; compare_at_price: number | null } | null,
): { price: number; compareAt: number | null } {
  if (variant?.price != null) {
    return { price: variant.price, compareAt: variant.compare_at_price };
  }
  return { price: product.price, compareAt: product.compare_at_price };
}
