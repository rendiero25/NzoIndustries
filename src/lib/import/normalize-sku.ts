/**
 * D-23: SKU web harus cocok dengan constraint schema
 * `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` (dipakai juga sebagai folder Cloudinary).
 * SKU asli tetap disimpan di `source_sku` untuk sinkron Jubelio/marketplace.
 */
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const SEPARATORS = /[\s/+\\|,;:]+/g;
const DROPPED = /[^A-Za-z0-9._-]/g;

export function normalizeSku(raw: string): string {
  const out = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(SEPARATORS, "-")
    .replace(DROPPED, "")
    .replace(/-{2,}/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 64)
    .replace(/[._-]+$/g, "");
  return out;
}

export function isValidSku(sku: string): boolean {
  return SKU_PATTERN.test(sku) && !sku.includes("..");
}

/**
 * Normalisasi + jaga keunikan dalam satu import. Tabrakan diberi akhiran
 * `-2`, `-3`, … (dilaporkan sebagai warning oleh pemanggil).
 */
export function createSkuAllocator() {
  const used = new Set<string>();
  return {
    allocate(raw: string): { sku: string; changed: boolean; collided: boolean } | null {
      const base = normalizeSku(raw);
      if (!base || !isValidSku(base)) return null;
      let sku = base;
      let n = 1;
      while (used.has(sku.toUpperCase())) {
        n += 1;
        const suffix = `-${n}`;
        sku = `${base.slice(0, 64 - suffix.length)}${suffix}`;
      }
      used.add(sku.toUpperCase());
      return { sku, changed: sku !== raw.trim(), collided: n > 1 };
    },
    reserve(sku: string) {
      used.add(sku.toUpperCase());
    },
    has(sku: string) {
      return used.has(sku.toUpperCase());
    },
  };
}

/**
 * SKU induk untuk produk bervarian: prefix bersama SKU varian, dipotong di
 * pemisah terakhir, minimal 4 karakter. Bila tidak ada, `{SKU pertama}-GRP`.
 */
export function parentSkuFor(variantSkus: string[]): string {
  const first = variantSkus[0] ?? "";
  let prefix = first;
  for (const s of variantSkus.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < s.length && prefix[i] === s[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  const cut = prefix.search(/[-_.][^-_.]*$/);
  const trimmed = (cut > 0 ? prefix.slice(0, cut) : prefix).replace(/[._-]+$/g, "");
  const set = new Set(variantSkus.map((s) => s.toUpperCase()));
  if (trimmed.length >= 4 && isValidSku(trimmed) && !set.has(trimmed.toUpperCase())) {
    return trimmed;
  }
  return `${first.slice(0, 60)}-GRP`;
}
