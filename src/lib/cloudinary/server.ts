import "server-only";

import { getServerEnv } from "@/lib/env";
import { getClientEnv } from "@/lib/env.client";

import { isNzoPublicId } from "./folders";
import { signCloudinaryParams, type ParamsToSign } from "./signature";

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

/** null bila env Cloudinary belum lengkap (fitur upload dimatikan dengan pesan jelas). */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = getServerEnv();
  const cloudName = getClientEnv().NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  return { cloudName, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET };
}

export function signParams(config: CloudinaryConfig, params: ParamsToSign): string {
  return signCloudinaryParams(params, config.apiSecret);
}

export type CloudinaryAsset = {
  public_id: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  resource_type: string;
};

/** Admin API: detail aset. null bila tidak ada. Hanya untuk public_id `nzo/…`. */
export async function getAsset(
  config: CloudinaryConfig,
  publicId: string,
): Promise<CloudinaryAsset | null> {
  if (!isNzoPublicId(publicId)) throw new Error("public_id di luar nzo/");
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload/${publicId
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
  return (await res.json()) as CloudinaryAsset;
}

/** Hapus aset (D-16: hanya `nzo/…`). Mengembalikan true bila terhapus/tidak ada. */
export async function destroyAsset(config: CloudinaryConfig, publicId: string): Promise<boolean> {
  if (!isNzoPublicId(publicId)) throw new Error("public_id di luar nzo/");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams(config, { public_id: publicId, timestamp, invalidate: "true" });
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    invalidate: "true",
    api_key: config.apiKey,
    signature,
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: "POST",
    body,
    cache: "no-store",
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { result?: string };
  return json.result === "ok" || json.result === "not found";
}
