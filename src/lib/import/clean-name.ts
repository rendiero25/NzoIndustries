/**
 * D-24: judul marketplace (penuh sinonim & kata kunci) dirapikan jadi nama
 * tampil yang pendek. Judul asli tetap disimpan di `search_keywords`.
 * Aturan sengaja konservatif: hanya membuang yang jelas duplikat/noise.
 */

/** Kata dalam satu grup dianggap sama; kemunculan berikutnya dibuang. Elemen pertama = bentuk kanonik. */
const SYNONYM_GROUPS: string[][] = [
  ["SEHER", "SEKER"],
  ["STANG", "SETANG"],
  ["GEAR", "GER", "GIR", "GIGI"],
  ["BEARING", "LAHER", "LAKER", "BERING"],
  ["PAKING", "PERPAK", "GASKET", "PACKING"],
  ["SEAL", "SIL", "SEL"],
  ["MIKA", "MICA", "KACA", "LENSA"],
  ["SPAKBOR", "SLEBOR", "SELEBOR", "SEPAKBOR"],
  ["COVER", "KOVER"],
  ["BODY", "BODI"],
  ["KUNCI", "KEY"],
  ["ROLLER", "ROLER"],
  ["RANTAI", "RANTE", "CHAIN"],
  ["BAUT", "BOLT"],
  ["SHOCK", "SKOK", "SOK", "SOKSKOK", "SHOCKBREAKER", "ABSORBER"],
  ["SUSPENSI", "SUSPENSION"],
  ["HANDLE", "HANDEL"],
  ["FILTER", "SARINGAN"],
  ["PER", "PIR", "SPRING"],
  ["SPEEDOMETER", "SPEEDO", "SPIDO", "SPEDO", "SPIDOMETER", "SPEDOMETER"],
  ["KARBURATOR", "KARBU", "CARBU", "CARBURETOR"],
  ["SELANG", "SLANG"],
  ["SAKLAR", "SAKELAR", "SWITCH", "SWIT"],
  ["KABEL", "CABLE"],
  ["BRACKET", "BREKET", "BRAKET"],
  ["KOIL", "COIL"],
  ["STIKER", "STICKER"],
  ["REFLEKTOR", "REFLECTOR"],
  ["KNALPOT", "MUFFLER", "MUFLER"],
  ["MUR", "NUT"],
  ["KLEP", "KELEP"],
  ["KRAN", "KERAN"],
  ["VELG", "VELK"],
  ["BEHEL", "BEGEL"],
  ["KALIPER", "CALIPER"],
  ["SPION", "SEPION", "MIRROR", "MIROR"],
  ["STANDAR", "STANDART", "SETANDAR"],
  ["KOPLING", "COPLING", "CLUTCH"],
  ["DEPAN", "DPN", "FRONT"],
  ["BELAKANG", "BLK", "BLKG", "REAR"],
  ["KIRI", "LEFT"],
  ["KANAN", "RIGHT"],
  ["PLAT", "PELAT", "PLATE"],
  ["KAMPAS", "KANVAS"],
  ["DISCPAD", "DISKPAD", "DISPAD"],
  ["STARTER", "STATER"],
  ["TROMOL", "TEROMOL"],
  ["GEARBOX", "GERBOK", "GIRBOX", "GEARBOK"],
  ["HANDGRIP", "HANFAT", "HANDFAT"],
  ["BUSI", "SPARKPLUG"],
  ["OLI", "OIL", "PELUMAS"],
  ["PIN", "PEN"],
  ["BOSH", "BOS"],
  ["TIMING", "TEMING"],
  ["KETIAK", "KTIAK"],
  ["WHITENING", "WHAITENING"],
  ["KRIM", "CREAM"],
  ["PRIVAT", "PRIVATE"],
  ["INJEKSI", "INJECTION", "INJEKTOR"],
  ["LAMPU", "LAMP"],
  ["HEADLAMP", "HEADLIGHT"],
  ["STOPLAMP", "STOPLAMPU"],
  ["SILINDER", "CYLINDER"],
  ["KARET", "RUBBER"],
  ["UKURAN", "UK"],
  ["UNTUK", "UTK"],
  ["SUDAH", "SDH"],
];

/** Dibuang di mana pun (penanda asli/kualitas/marketing). */
const NOISE_TOKENS = new Set([
  "ORI",
  "ORIGINAL",
  "ORGINAL",
  "ORIGINIL",
  "ASLI",
  "MURAH",
  "MURAHAN",
  "TERMURAH",
  "PROMO",
  "READY",
  "STOCK",
  "STOK",
]);

const NOISE_PHRASES: RegExp[] = [
  /\bH(?:A)?RGA\s+PER\s*(?:\d+\s*)?(?:BIJI|BJI|PCS|SET|PASANG|PSG)?\b/g,
  /\bH(?:A)?RGA\s+PERB(?:I)?JI\b/g,
  /\bH(?:A)?RGA\s+(?:ECER|SATUAN|GROSIR)\b/g,
  /\b\d+\s*(?:BIJI|BJI)\b/g,
  /\bLOKAL\s+JAMINAN(?:\s+KUALITAS)?\b/g,
  /\bJAMINAN\s+KUALITAS\b/g,
  /\bGK\s+MURAHAN\b/g,
  /\bBEST\s+QUALITY\b/g,
  /\bKUALITAS\s+(?:TERBAIK|PREMIUM|BAGUS)\b/g,
  /\bBAHAN\s+TEBAL\b/g,
];

/** Pola nomor part pabrikan (Honda 12251-K56-N02, Yamaha 2DP-F7111-00, dll.). */
const PART_NUMBER =
  /\b(?:\d{5}-[A-Z0-9]{3,5}-[A-Z0-9]{2,4}(?:-[A-Z0-9]{1,4})?|[0-9A-Z]{3}-[A-Z0-9]{5}-\d{2}(?:-[A-Z0-9]{2,4})?|\d{5}-\d{5}(?:-\d{3})?)\b/g;

/** Tetap kapital walau pendek/biasa (kode model, singkatan teknis, merek). */
const KEEP_UPPER = new Set([
  "ECU",
  "ECM",
  "CDI",
  "FI",
  "ESP",
  "LED",
  "ABS",
  "CVT",
  "ISS",
  "CBS",
  "SMS",
  "PGM",
  "PGMFI",
  "RR",
  "SS",
  "MX",
  "ZR",
  "GT",
  "PCX",
  "ADV",
  "CB",
  "CBR",
  "CRF",
  "GL",
  "RX",
  "RXK",
  "YZ",
  "YZF",
  "KLX",
  "ZX",
  "TS",
  "NPP",
  "NPR",
  "YGP",
  "HGP",
  "AHM",
  "KGP",
  "SGP",
  "NGK",
  "BRT",
  "TDR",
  "SSS",
  "KTC",
  "QTT",
  "KNZ",
  "FIM",
  "RK",
  "ASB",
  "RPD",
  "GF",
  "TK",
  "UMA",
  "YSS",
  "KYB",
  "DID",
  "NOK",
  "TWH",
  "VND",
  "SKR",
  "RCB",
  "RCM",
  "TGP",
  "PSM",
  "JPA",
  "GMA",
  "HRD",
  "SKF",
  "MT",
  "WR",
  "XSR",
  "GSX",
  "GTR",
  "STD",
  "OS",
  "TPS",
  "TPMS",
  "USB",
  "AC",
  "DC",
  "HID",
  "BPOM",
  "SNI",
  "JIS",
  "API",
  "SAE",
  "JASO",
  "ATV",
  "UTV",
  "CC",
  "MM",
  "CM",
  "ML",
  "KG",
  "PCS",
]);

/** Penulisan resmi nama model/merek yang tidak cocok dengan Title Case biasa. */
const DISPLAY_OVERRIDES: Record<string, string> = {
  RXKING: "RX-King",
  "RX-KING": "RX-King",
  MXKING: "MX King",
  NMAX: "NMAX",
  XMAX: "XMAX",
  XRIDE: "X-Ride",
  "X-RIDE": "X-Ride",
  BEAT: "BeAT",
  FIZR: "F1ZR",
  "FIZ-R": "F1ZR",
  "V-IXION": "Vixion",
  FREEGO: "FreeGo",
  MEGAPRO: "MegaPro",
  KLX: "KLX",
  MOTO1: "Moto1",
  "D.I.D": "D.I.D",
};

const LOWER_WORDS = new Set([
  "DAN",
  "ATAU",
  "UNTUK",
  "DENGAN",
  "WITH",
  "FOR",
  "AND",
  "OF",
  "DI",
  "KE",
]);

const synonymIndex = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, i) => group.forEach((w) => synonymIndex.set(w, i)));

export type CleanNameResult = {
  name: string;
  partNumbers: string[];
};

function titleToken(token: string): string {
  if (!/[A-Z]/.test(token)) return token;
  const override = DISPLAY_OVERRIDES[token];
  if (override) return override;
  if (/\d/.test(token)) return token;
  if (KEEP_UPPER.has(token.replace(/[^A-Z]/g, ""))) return token;
  if (LOWER_WORDS.has(token)) return token.toLowerCase();
  return token
    .toLowerCase()
    .replace(/(^|[-'(])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Label varian ("BIRU METALIK" → "Biru Metalik"); kode/angka dibiarkan. */
export function tidyLabel(label: string): string {
  const t = label.replace(/\s+/g, " ").trim();
  if (t !== t.toUpperCase()) return t;
  return t
    .split(" ")
    .map((w) => titleToken(w))
    .join(" ");
}

/** Kunci perbandingan alias: "RX-K", "RX K", "RXK" → "RXK". */
const aliasKey = (s: string) => s.replace(/[^A-Z0-9]/g, "");

export function cleanProductName(
  raw: string,
  opts: { maxLength?: number; sku?: string } = {},
): CleanNameResult {
  const maxLength = opts.maxLength ?? 90;
  let text = raw.toUpperCase().replace(/\s+/g, " ").trim();

  const partNumbers = [...new Set(text.match(PART_NUMBER) ?? [])];
  text = text.replace(PART_NUMBER, " ");
  if (opts.sku) {
    const skuUpper = opts.sku.toUpperCase();
    text = text.replace(
      new RegExp(`(^|\\s)${skuUpper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "g"),
      " ",
    );
  }
  for (const re of NOISE_PHRASES) text = text.replace(re, " ");

  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/^[,.;:]+|[,.;:]+$/g, ""))
    .filter(Boolean);

  const seenGroups = new Set<number>();
  const seenKeys = new Set<string>();
  const out: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (NOISE_TOKENS.has(t)) continue;
    if (t === "-" || t === "&" || t === "/") {
      if (out.length && out[out.length - 1] !== t) out.push(t);
      continue;
    }
    const group = synonymIndex.get(t);
    if (group !== undefined) {
      if (seenGroups.has(group)) continue;
      seenGroups.add(group);
    }
    // alias multi-token: "RX KING" setelah "RXKING", "N MAX" setelah "NMAX"
    let skip = false;
    for (let span = 3; span >= 1; span--) {
      if (i + span > tokens.length) continue;
      const key = aliasKey(tokens.slice(i, i + span).join(""));
      if (key.length >= 2 && seenKeys.has(key) && (span > 1 || key.length >= 2)) {
        i += span - 1;
        skip = true;
        break;
      }
    }
    if (skip) continue;
    const key = aliasKey(t);
    if (key) seenKeys.add(key);
    // gabungan dengan token sebelumnya: "RX KING" ⇒ kunci "RXKING" (menangkap "RX-KING" berikutnya)
    const prev = out[out.length - 1];
    const prev2 = out[out.length - 2];
    if (prev) seenKeys.add(aliasKey(prev + t));
    if (prev && prev2) seenKeys.add(aliasKey(prev2 + prev + t));
    out.push(t);
  }

  // rapikan separator di ujung
  while (out.length && ["-", "&", "/"].includes(out[out.length - 1]!)) out.pop();
  while (out.length && ["-", "&", "/"].includes(out[0]!)) out.shift();

  let name = "";
  for (const t of out) {
    const next = name ? `${name} ${t}` : t;
    if (next.length > maxLength) break;
    name = next;
  }
  if (!name && out.length) name = out[0]!.slice(0, maxLength);

  name = name
    .split(" ")
    .map((t, idx) =>
      idx === 0 && LOWER_WORDS.has(t)
        ? titleToken(t).replace(/^./, (c) => c.toUpperCase())
        : titleToken(t),
    )
    .join(" ")
    .replace(/\s+([,.)])/g, "$1")
    .trim();

  return { name, partNumbers };
}
