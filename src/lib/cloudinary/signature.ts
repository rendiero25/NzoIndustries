/**
 * Validasi + tanda tangan parameter upload Cloudinary (tanpa SDK). Murni
 * (tanpa env) supaya bisa diuji unit; pemakai server ada di `server.ts`.
 */
import { createHash } from "node:crypto";

import { buildCloudinaryFolder, type CloudinarySection } from "./folders.ts";

export const ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Parameter yang boleh ditandatangani. Selain ini ditolak (mis. overwrite, type, eager). */
const SIGNABLE = new Set([
  "timestamp",
  "folder",
  "source",
  "public_id",
  "allowed_formats",
  "tags",
  "context",
]);

export type ParamsToSign = Record<string, string | number>;

/** Cloudinary: urutkan key, gabung `k=v` dengan `&`, tambah secret, SHA-1 hex. */
export function signCloudinaryParams(params: ParamsToSign, apiSecret: string): string {
  const payload = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(payload + apiSecret)
    .digest("hex");
}

export type UploadParamsCheck = { ok: true; params: ParamsToSign } | { ok: false; error: string };

/**
 * Folder SELALU dari server (D-16). Parameter dari widget hanya diterima bila
 * folder sama persis dengan folder yang dibangun server, timestamp segar, dan
 * tidak ada parameter di luar daftar.
 */
export function checkUploadParams(
  input: ParamsToSign,
  target: { section: CloudinarySection; sku?: string },
  now: number = Date.now(),
): UploadParamsCheck {
  let folder: string;
  try {
    folder = buildCloudinaryFolder(target.section, target.sku);
  } catch {
    return { ok: false, error: "Folder tujuan tidak valid" };
  }

  for (const key of Object.keys(input)) {
    if (!SIGNABLE.has(key)) return { ok: false, error: `Parameter ${key} tidak diizinkan` };
  }

  const timestamp = Number(input.timestamp);
  if (!Number.isInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 60 * 60) {
    return { ok: false, error: "Timestamp tidak valid" };
  }

  if (String(input.folder ?? "") !== folder) {
    return { ok: false, error: "Folder harus sesuai SKU/section" };
  }

  if (input.public_id !== undefined) {
    const pid = String(input.public_id);
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(pid)) return { ok: false, error: "public_id tidak valid" };
  }

  // Tanda tangan harus mencakup persis parameter yang dikirim widget, jadi
  // format/ukuran tidak bisa disuntik di sini: keduanya diverifikasi ulang
  // lewat Admin API saat gambar disambungkan ke produk (attachProductImage).
  return { ok: true, params: input };
}
