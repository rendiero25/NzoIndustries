/**
 * Normalisasi `paymentMethod` Mayar yang bebas ("QRIS", "va/bni",
 * "ewallet/gopay", …) menjadi kunci pendek untuk label/logo.
 */
const WALLETS = ["gopay", "shopeepay", "dana", "linkaja", "ovo", "jenius"] as const;
const OUTLETS = ["alfamart", "indomaret"] as const;
const VA_BANKS = ["bca", "bni", "bri", "mandiri", "permata", "cimb", "bsi", "bjb"] as const;

export function normalizeMayarPaymentMethod(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tokens = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  if (tokens.includes("qris")) return "qris";
  for (const w of WALLETS) if (tokens.includes(w)) return w;
  for (const o of OUTLETS) if (tokens.includes(o)) return o;
  for (const b of VA_BANKS) if (tokens.includes(b)) return `${b}_va`;
  if (tokens.includes("credit") || tokens.includes("card") || tokens.includes("cc")) {
    return "credit_card";
  }
  return tokens.join("_").slice(0, 40);
}

const LABELS: Record<string, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  dana: "DANA",
  linkaja: "LinkAja",
  ovo: "OVO",
  jenius: "Jenius",
  alfamart: "Alfamart",
  indomaret: "Indomaret",
  credit_card: "Kartu kredit/debit",
  simulator: "Simulator (uji)",
};

/** Label tampilan metode bayar ("bca_va" → "Virtual Account BCA"). */
export function paymentMethodLabel(method: string | null | undefined): string | null {
  if (!method) return null;
  if (LABELS[method]) return LABELS[method];
  if (method.endsWith("_va")) return `Virtual Account ${method.slice(0, -3).toUpperCase()}`;
  return method.replace(/_/g, " ");
}
