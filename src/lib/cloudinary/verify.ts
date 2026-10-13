import "server-only";

import { buildCloudinaryFolder, type CloudinarySection } from "./folders";
import { destroyAsset, getAsset, getCloudinaryConfig } from "./server";
import { ALLOWED_IMAGE_FORMATS } from "./signature";

/**
 * Verifikasi gambar hasil upload widget sebelum disimpan (security rule 9):
 * harus di folder section, ada di Cloudinary, JPG/PNG/WebP, dan tidak melebihi
 * `maxBytes`. Aset yang gagal dihapus dari Cloudinary.
 */
export async function verifyUploadedImage(
  publicId: string,
  section: Exclude<CloudinarySection, "products">,
  maxBytes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const folder = buildCloudinaryFolder(section);
  if (!publicId.startsWith(`${folder}/`) || publicId.includes("..")) {
    return { ok: false, error: "Gambar harus diunggah lewat tombol unggah di halaman ini." };
  }
  const config = getCloudinaryConfig();
  if (!config) return { ok: false, error: "Cloudinary belum dikonfigurasi." };
  const asset = await getAsset(config, publicId).catch(() => null);
  if (!asset) return { ok: false, error: "Gambar tidak ditemukan di Cloudinary." };
  if (
    !(ALLOWED_IMAGE_FORMATS as readonly string[]).includes(asset.format) ||
    asset.bytes > maxBytes
  ) {
    await destroyAsset(config, publicId).catch(() => false);
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { ok: false, error: `Gambar harus JPG, PNG, atau WebP maksimal ${mb} MB.` };
  }
  return { ok: true };
}
