import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { checkRole } from "@/lib/auth/guards";
import { isCloudinarySection } from "@/lib/cloudinary/folders";
import { getCloudinaryConfig, signParams } from "@/lib/cloudinary/server";
import { checkUploadParams } from "@/lib/cloudinary/signature";

/**
 * Signature upload Cloudinary untuk `CldUploadWidget` (security rule 9).
 * Hanya owner/admin. Folder tujuan dibangun server dari `?section=&sku=`;
 * parameter widget ditolak bila folder berbeda atau memuat parameter lain.
 */
const bodySchema = z.object({
  paramsToSign: z.record(z.string(), z.union([z.string().max(500), z.number()])),
});

export async function POST(req: NextRequest) {
  const { decision } = await checkRole(["owner", "admin"]);
  if (!decision.ok) {
    const status = decision.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: "Tidak diizinkan" }, { status });
  }

  const config = getCloudinaryConfig();
  if (!config)
    return NextResponse.json({ error: "Cloudinary belum dikonfigurasi" }, { status: 503 });

  const section = req.nextUrl.searchParams.get("section") ?? "";
  const sku = req.nextUrl.searchParams.get("sku") ?? undefined;
  if (!isCloudinarySection(section)) {
    return NextResponse.json({ error: "Section tidak valid" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });

  const check = checkUploadParams(parsed.data.paramsToSign, { section, sku: sku || undefined });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  return NextResponse.json({ signature: signParams(config, check.params) });
}
