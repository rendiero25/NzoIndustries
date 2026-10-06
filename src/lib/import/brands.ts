/**
 * Kamus merek dari frekuensi klausa "ORI ORIGINAL {merek} ASLI" di export
 * Jubelio. Merek pabrikan (YGP/HGP/KGP/SGP) unik sehingga dicari di seluruh
 * nama; merek aftermarket hanya dicari di ekor nama setelah "ORI/ORIGINAL"
 * (kata seperti WIN/RK/FIM terlalu umum untuk dicari di badan nama).
 */
type BrandRule = { name: string; slug: string; pattern: RegExp };

const GENUINE: BrandRule[] = [
  { name: "Yamaha Genuine Parts", slug: "yamaha-ygp", pattern: /\bYGP\b/ },
  { name: "Honda Genuine Parts", slug: "honda-hgp", pattern: /\b(?:AHM\s+HGP|HGP|AHM)\b/ },
  { name: "Kawasaki Genuine Parts", slug: "kawasaki-kgp", pattern: /\bKGP\b/ },
  { name: "Suzuki Genuine Parts", slug: "suzuki-sgp", pattern: /\bSGP\b/ },
];

const DISTINCTIVE: BrandRule[] = [
  { name: "NGK", slug: "ngk", pattern: /\bNGK\b/ },
  { name: "Osram", slug: "osram", pattern: /\bOSRAM\b/ },
  { name: "Motul", slug: "motul", pattern: /\bMOTUL\b/ },
  { name: "YSS", slug: "yss", pattern: /\bYSS\b/ },
  { name: "KYB", slug: "kyb", pattern: /\b(?:KYB|KAYABA)\b/ },
  { name: "Aspira", slug: "aspira", pattern: /\bASPIRA\b/ },
  { name: "Federal", slug: "federal", pattern: /\bFEDERAL\b/ },
  { name: "Daytona", slug: "daytona", pattern: /\bDAYTONA\b/ },
  { name: "Denso", slug: "denso", pattern: /\bDENSO\b/ },
  { name: "Yamalube", slug: "yamalube", pattern: /\bYAMALUBE\b/ },
  { name: "Shell", slug: "shell", pattern: /\bSHELL\s+ADVANCE\b/ },
  { name: "Liqui Moly", slug: "liqui-moly", pattern: /\bLIQUI\s*MOLY\b/ },
  { name: "Tekiro", slug: "tekiro", pattern: /\bTEKIRO\b/ },
  { name: "Takegawa", slug: "takegawa", pattern: /\bTAKEGAWA\b/ },
  { name: "Motobatt", slug: "motobatt", pattern: /\bMOTOBATT\b/ },
];

/** Dicari hanya di ekor setelah ORI/ORIGINAL. Urutan: yang lebih spesifik dulu. */
const TAIL: BrandRule[] = [
  { name: "NPP", slug: "npp", pattern: /\bNP[PR]\b/ },
  { name: "WIN", slug: "win", pattern: /\bWIN\b/ },
  { name: "Moto1", slug: "moto1", pattern: /\bMOTO\s?1\b/ },
  { name: "SSS", slug: "sss", pattern: /\bSSS\b/ },
  { name: "TDR Racing", slug: "tdr-racing", pattern: /\bTDR\b/ },
  { name: "Racing Boy", slug: "racing-boy", pattern: /\b(?:RCBB?|RACING\s?BOY)\b/ },
  { name: "Faito", slug: "faito", pattern: /\bFAITO\b/ },
  { name: "Wipro", slug: "wipro", pattern: /\bWIPRO\b/ },
  { name: "Kawahara", slug: "kawahara", pattern: /\b(?:KAWAHARA|KWR)\b/ },
  { name: "TK Racing", slug: "tk-racing", pattern: /\bTK\s+RACING\b/ },
  { name: "UMA Racing", slug: "uma-racing", pattern: /\bUMA\s+RACING\b/ },
  { name: "BRT", slug: "brt", pattern: /\bBRT\b/ },
  { name: "KTC Kytaco", slug: "ktc-kytaco", pattern: /\b(?:KTC|KYTACO)\b/ },
  { name: "QTT", slug: "qtt", pattern: /\bQTT\b/ },
  { name: "KNZ", slug: "knz", pattern: /\bKNZ\b/ },
  { name: "Mega Prima", slug: "mega-prima", pattern: /\bMEGA\s+PRIMA\b/ },
  { name: "FIM", slug: "fim", pattern: /\bFIM\b/ },
  { name: "Wilwood", slug: "wilwood", pattern: /\bWILWOOD\b/ },
  { name: "Denshin", slug: "denshin", pattern: /\bDENSHIN\b/ },
  { name: "Choho", slug: "choho", pattern: /\bCHOHO\b/ },
  { name: "RK", slug: "rk", pattern: /\bRK\b/ },
  { name: "ASB", slug: "asb", pattern: /\bASB\b/ },
  { name: "RPD", slug: "rpd", pattern: /\bRPD\b/ },
  { name: "GF Racing", slug: "gf-racing", pattern: /\bGF\s+RACING\b/ },
  { name: "Koyo", slug: "koyo", pattern: /\bKOYO\b/ },
  { name: "MAX1", slug: "max1", pattern: /\bMAX\s?1\b/ },
  { name: "Fajar Indah Otomotif", slug: "fajar-indah", pattern: /\bFAJAR\s+INDAH\b/ },
  { name: "Ryu", slug: "ryu", pattern: /\bRYU\b/ },
  { name: "Bellford", slug: "bellford", pattern: /\bBELLFORD\b/ },
  { name: "AHRS", slug: "ahrs", pattern: /\bAHRS\b/ },
  { name: "Fuboru", slug: "fuboru", pattern: /\bFUBORU\b/ },
  { name: "Petroasia", slug: "petroasia", pattern: /\bPETROASIA\b/ },
  { name: "Ride It", slug: "ride-it", pattern: /\bRIDE\s+IT\b/ },
  { name: "TWH", slug: "twh", pattern: /\bTWH\b/ },
  { name: "Xtreme", slug: "xtreme", pattern: /\bX-?TREME?\b/ },
  { name: "Taiyo", slug: "taiyo", pattern: /\bTAIYO\b/ },
  { name: "4S1M", slug: "4s1m", pattern: /\b4S1M\b/ },
  { name: "Enduro", slug: "enduro", pattern: /\bENDURO\b/ },
  { name: "VND", slug: "vnd", pattern: /\bVND\b/ },
  { name: "SKR", slug: "skr", pattern: /\bSKR\b/ },
  { name: "RCM", slug: "rcm", pattern: /\bRCM\b/ },
  { name: "Supertrack", slug: "supertrack", pattern: /\bSUPERTRACK\b/ },
  { name: "Yoto", slug: "yoto", pattern: /\bYOTO\b/ },
  { name: "Duromoto", slug: "duromoto", pattern: /\bDUROMOTO\b/ },
  { name: "TGP", slug: "tgp", pattern: /\bTGP\b/ },
  { name: "NOK", slug: "nok", pattern: /\bNOK\b/ },
  { name: "Koizumi", slug: "koizumi", pattern: /\bKOIZUMI\b/ },
  { name: "PSM", slug: "psm", pattern: /\bPSM\b/ },
  { name: "JPA", slug: "jpa", pattern: /\bJPA\b/ },
  { name: "Autovision", slug: "autovision", pattern: /\bAUTOVISION\b/ },
  { name: "BPRO", slug: "bpro", pattern: /\bBPRO\b/ },
  { name: "D.I.D", slug: "did", pattern: /\bD\.?I\.?D\b/ },
  { name: "Racing Bee", slug: "racing-bee", pattern: /\bRACING\s+BEE\b/ },
  { name: "Vrossi", slug: "vrossi", pattern: /\bVROSSI\b/ },
  { name: "Yuzaka", slug: "yuzaka", pattern: /\bYUZAKA\b/ },
  { name: "GMA", slug: "gma", pattern: /\bGMA\b/ },
  { name: "HRD", slug: "hrd", pattern: /\bHRD\b/ },
  { name: "Indoparts", slug: "indoparts", pattern: /\bINDOPARTS\b/ },
  { name: "Luminos", slug: "luminos", pattern: /\bLUMINOS\b/ },
  { name: "SKF", slug: "skf", pattern: /\bSKF\b/ },
  { name: "Brembo", slug: "brembo", pattern: /\bBREMBO\b/ },
  { name: "Kitaco", slug: "kitaco", pattern: /\bKITACO\b/ },
];

export type BrandMatch = { name: string; slug: string };

export function detectBrand(rawName: string): BrandMatch | null {
  const upper = rawName.toUpperCase();
  for (const rule of GENUINE)
    if (rule.pattern.test(upper)) return { name: rule.name, slug: rule.slug };

  const tailStart = upper.search(/\bORI(?:GINAL)?\b/);
  const tail = tailStart >= 0 ? upper.slice(tailStart) : "";
  if (tail) {
    for (const rule of [...DISTINCTIVE, ...TAIL]) {
      if (rule.pattern.test(tail)) return { name: rule.name, slug: rule.slug };
    }
  }
  for (const rule of DISTINCTIVE)
    if (rule.pattern.test(upper)) return { name: rule.name, slug: rule.slug };
  return null;
}
