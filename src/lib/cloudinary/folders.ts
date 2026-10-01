/**
 * Semua aset NZO di akun Cloudinary bersama disimpan di bawah satu root folder,
 * supaya tidak tercampur dengan data lain di akun yang sama (design-system.md §11).
 *
 * Folder upload SELALU dibangun di server lewat helper ini. Nilai folder dari
 * client tidak pernah dipakai langsung (dipakai oleh /api/cloudinary/sign, Fase 3).
 */
export const CLOUDINARY_ROOT_FOLDER = "nzo";

export const CLOUDINARY_SECTIONS = ["products", "banners", "brands", "content"] as const;

export type CloudinarySection = (typeof CLOUDINARY_SECTIONS)[number];

/** SKU sebagai nama subfolder: huruf, angka, `-`, `_`, `.`; tanpa `/` atau `..`. */
const SKU_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function isCloudinarySection(value: string): value is CloudinarySection {
  return (CLOUDINARY_SECTIONS as readonly string[]).includes(value);
}

/**
 * `products` wajib SKU → `nzo/products/{sku}`. Section lain tanpa SKU → `nzo/{section}`.
 * Melempar error bila input tidak valid.
 */
export function buildCloudinaryFolder(section: CloudinarySection, sku?: string): string {
  if (section === "products") {
    if (!sku || !SKU_SEGMENT.test(sku) || sku.includes("..")) {
      throw new Error("SKU tidak valid untuk folder Cloudinary");
    }
    return `${CLOUDINARY_ROOT_FOLDER}/products/${sku}`;
  }
  if (sku !== undefined) {
    throw new Error(`Section ${section} tidak memakai SKU`);
  }
  return `${CLOUDINARY_ROOT_FOLDER}/${section}`;
}

/** Pastikan public_id hasil upload/hapus berada di dalam root NZO. */
export function isNzoPublicId(publicId: string): boolean {
  return publicId.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`) && !publicId.includes("..");
}
