/**
 * Berat tagihan kurir (aturan bisnis ongkir): yang terbesar antara berat aktual
 * dan berat volumetrik p×l×t/6000 (cm → kg). Berat kosong memakai default
 * sampai data berat produk tersedia (D-30).
 */
export type ParcelItem = {
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
};

export function volumetricGrams(lengthMm: number, widthMm: number, heightMm: number): number {
  // (cm × cm × cm) / 6000 = kg → ×1000 gram. mm → cm dibagi 10.
  const cm3 = (lengthMm / 10) * (widthMm / 10) * (heightMm / 10);
  return Math.ceil((cm3 / 6000) * 1000);
}

/** Berat tagihan satu unit (gram). */
export function chargeableUnitGrams(item: ParcelItem, defaultGrams: number): number {
  const actual = item.weightGrams && item.weightGrams > 0 ? item.weightGrams : defaultGrams;
  const { lengthMm, widthMm, heightMm } = item;
  if (lengthMm && widthMm && heightMm && lengthMm > 0 && widthMm > 0 && heightMm > 0) {
    return Math.max(actual, volumetricGrams(lengthMm, widthMm, heightMm));
  }
  return actual;
}

/** Total berat tagihan paket (gram), minimal 1. */
export function parcelGrams(items: ParcelItem[], defaultGrams: number): number {
  const total = items.reduce(
    (sum, item) => sum + chargeableUnitGrams(item, defaultGrams) * Math.max(0, item.quantity),
    0,
  );
  return Math.max(1, total);
}
