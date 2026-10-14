/** Helper murni dokumen cetak (Fase 9). Tanpa dependensi server supaya bisa diuji unit. */

export const INVOICE_NUMBER_RE = /^INV\/\d{4}\/\d{6,}$/;
export const ORDER_NUMBER_RE = /^NZO-\d{6}-[A-Z0-9]{6}$/;

const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 150000 → "Rp150.000" (tanpa spasi, rapat untuk tabel PDF). */
export function rupiah(amount: number): string {
  const n = Math.round(Number.isFinite(amount) ? amount : 0);
  return `${n < 0 ? "-" : ""}Rp${idr.format(Math.abs(n))}`;
}

const wibDate = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long" });
const wibDateTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatWibDate(iso: string | null | undefined): string {
  return iso ? wibDate.format(new Date(iso)) : "—";
}

export function formatWibDateTime(iso: string | null | undefined): string {
  return iso ? `${wibDateTime.format(new Date(iso))} WIB` : "—";
}

/** Berat paket (gram): jumlah berat item × qty; item tanpa berat memakai default. */
export function packageWeightGrams(
  items: { quantity: number; weightGrams: number | null }[],
  defaultGrams: number,
): number {
  return items.reduce(
    (sum, i) =>
      sum + (i.weightGrams && i.weightGrams > 0 ? i.weightGrams : defaultGrams) * i.quantity,
    0,
  );
}

/** 1250 → "1,25 kg"; 800 → "800 g". */
export function formatWeight(grams: number): string {
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${(grams / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
}

/** Alamat kirim (`orders.shipping_address`) jadi baris-baris siap cetak. */
export function addressLines(a: Record<string, unknown>): string[] {
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
  return [
    s("full_address"),
    [s("district"), s("city")].filter(Boolean).join(", "),
    [s("province"), s("postal_code")].filter(Boolean).join(" "),
  ].filter(Boolean);
}

/** Nama file aman: "INV/2026/000123" → "INV-2026-000123". */
export function documentFileName(base: string): string {
  return base.replace(/[^A-Za-z0-9._-]+/g, "-");
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  qris: "QRIS",
  va: "Virtual Account",
  bank_transfer: "Transfer bank",
  ewallet: "E-wallet",
  credit_card: "Kartu kredit/debit",
  manual_transfer: "Transfer manual",
};

export function paymentMethodLabel(method: string | null, provider: string | null): string {
  if (method && PAYMENT_METHOD_LABEL[method]) return PAYMENT_METHOD_LABEL[method];
  if (method) return method.replace(/_/g, " ").toUpperCase();
  if (provider === "test") return "Simulator (dev)";
  return provider === "mayar" ? "Mayar" : "—";
}
