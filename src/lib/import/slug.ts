/** Slug URL produk: nama bersih + hash pendek SKU (stabil antar import). */
export function slugify(input: string, maxLength = 80): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= maxLength) return base;
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

/** FNV-1a 32-bit, base36 6 karakter. Sama di browser dan Node (tanpa crypto). */
export function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(6, "0").slice(-6);
}

export function productSlug(name: string, sku: string): string {
  const base = slugify(name, 72) || "produk";
  return `${base}-${shortHash(sku.toUpperCase())}`;
}
