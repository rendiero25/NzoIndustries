import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";
import bwipjs from "bwip-js/node";

const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");
let fontsReady = false;

/** Daftarkan font Outfit (OFL) sekali per proses. */
export function ensurePdfFonts(): void {
  if (fontsReady) return;
  Font.register({
    family: "Outfit",
    fonts: [
      { src: path.join(FONT_DIR, "outfit-400.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "outfit-600.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "outfit-700.woff"), fontWeight: 700 },
    ],
  });
  // Jangan memotong kata (nomor resi/SKU) dengan tanda hubung.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

let logoCache: Buffer | null = null;

/** Logo NZO (PNG) sebagai buffer untuk `<Image>`. */
export function nzoLogo(): Buffer {
  logoCache ??= readFileSync(path.join(process.cwd(), "public/logo.png"));
  return logoCache;
}

/** Logo kurir dari `public/couriers/…` bila ada; null bila tidak. */
export function courierLogo(publicPath: string | undefined): Buffer | null {
  if (!publicPath || !publicPath.startsWith("/couriers/") || publicPath.includes("..")) return null;
  try {
    return readFileSync(path.join(process.cwd(), "public", publicPath));
  } catch {
    return null;
  }
}

/** Barcode Code128 (PNG hitam-putih) untuk nomor resi/pesanan. */
export async function code128Png(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: 14,
    includetext: false,
    backgroundcolor: "FFFFFF",
  });
}
