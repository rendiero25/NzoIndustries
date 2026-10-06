/**
 * Data kendaraan awal (merek → model → tahun) dan alias penulisan di nama
 * produk marketplace, untuk saran fitment saat import. Tahun produksi adalah
 * perkiraan pasar Indonesia; admin merapikan di Fase 8. Saran fitment tidak
 * di-commit otomatis (salah fitment merusak kepercayaan badge "Cocok").
 */
import type { FitmentSuggestion } from "./types.ts";

export type VehicleType = "motorcycle" | "car";

export type VehicleMakeSeed = { slug: string; name: string; type: VehicleType; sort: number };

export type VehicleModelSeed = {
  make: string;
  type: VehicleType;
  name: string;
  slug: string;
  yearStart: number;
  yearEnd: number | null;
  /** Pola alias (huruf besar, spasi/strip fleksibel lewat `aliasRegex`). */
  aliases: string[];
};

export const VEHICLE_MAKES: VehicleMakeSeed[] = [
  { slug: "honda", name: "Honda", type: "motorcycle", sort: 1 },
  { slug: "yamaha", name: "Yamaha", type: "motorcycle", sort: 2 },
  { slug: "suzuki", name: "Suzuki", type: "motorcycle", sort: 3 },
  { slug: "kawasaki", name: "Kawasaki", type: "motorcycle", sort: 4 },
  { slug: "vespa", name: "Vespa", type: "motorcycle", sort: 5 },
  { slug: "toyota", name: "Toyota", type: "car", sort: 1 },
  { slug: "honda", name: "Honda", type: "car", sort: 2 },
  { slug: "daihatsu", name: "Daihatsu", type: "car", sort: 3 },
  { slug: "suzuki", name: "Suzuki", type: "car", sort: 4 },
  { slug: "mitsubishi", name: "Mitsubishi", type: "car", sort: 5 },
];

const m = (
  make: string,
  name: string,
  slug: string,
  yearStart: number,
  yearEnd: number | null,
  aliases: string[],
  type: VehicleType = "motorcycle",
): VehicleModelSeed => ({ make, type, name, slug, yearStart, yearEnd, aliases });

/** Urutan dalam satu merek: yang lebih spesifik dulu (Vario 150 sebelum Vario). */
export const VEHICLE_MODELS: VehicleModelSeed[] = [
  // Honda motor
  m("honda", "BeAT", "beat", 2008, null, ["BEAT"]),
  m("honda", "Vario 160", "vario-160", 2022, null, ["VARIO 160"]),
  m("honda", "Vario 150", "vario-150", 2015, 2022, ["VARIO 150"]),
  m("honda", "Vario 125", "vario-125", 2012, null, ["VARIO 125"]),
  m("honda", "Vario 110", "vario-110", 2006, 2019, ["VARIO 110", "VARIO TECHNO", "VARIO KARBU"]),
  m("honda", "Scoopy", "scoopy", 2010, null, ["SCOOPY"]),
  m("honda", "Spacy", "spacy", 2011, 2018, ["SPACY"]),
  m("honda", "Genio", "genio", 2019, null, ["GENIO"]),
  m("honda", "PCX 160", "pcx-160", 2021, null, ["PCX 160"]),
  m("honda", "PCX 150", "pcx-150", 2014, 2020, ["PCX 150", "PCX"]),
  m("honda", "ADV 160", "adv-160", 2022, null, ["ADV 160"]),
  m("honda", "ADV 150", "adv-150", 2019, 2022, ["ADV 150", "ADV"]),
  m("honda", "Supra X 125", "supra-x-125", 2005, null, ["SUPRA X 125", "SUPRA X125", "SUPRA 125"]),
  m("honda", "Supra X", "supra-x", 1997, 2005, ["SUPRA X", "SUPRA FIT", "SUPRA"]),
  m("honda", "Astrea Grand", "astrea-grand", 1991, 2001, ["GRAND", "ASTREA", "PRIMA", "STAR"]),
  m("honda", "Revo", "revo", 2007, null, ["REVO", "ABSOLUTE REVO"]),
  m("honda", "Blade", "blade", 2008, 2018, ["BLADE"]),
  m("honda", "Sonic 150R", "sonic-150r", 2015, null, ["SONIC"]),
  m("honda", "CS1", "cs1", 2008, 2012, ["CS1", "CS 1"]),
  m("honda", "CB150R", "cb150r", 2012, null, ["CB150R", "CB 150 R", "CB 150R", "CB150", "CB 150"]),
  m("honda", "CBR150R", "cbr150r", 2002, null, ["CBR 150", "CBR150"]),
  m("honda", "CBR250RR", "cbr250rr", 2016, null, ["CBR 250", "CBR250"]),
  m("honda", "CRF150L", "crf150l", 2017, null, ["CRF 150", "CRF150", "CRF"]),
  m("honda", "MegaPro", "megapro", 1999, 2018, ["MEGA PRO", "MEGAPRO"]),
  m("honda", "Tiger", "tiger", 1993, 2013, ["TIGER"]),
  m("honda", "Verza", "verza", 2013, 2021, ["VERZA"]),
  m("honda", "Kharisma", "kharisma", 2003, 2005, ["KHARISMA", "KARISMA"]),
  m("honda", "GL Pro", "gl-pro", 1985, 2005, ["GL PRO", "GL100", "GL 100", "GL MAX"]),
  m("honda", "CB100", "cb100", 1971, 1990, ["CB100", "CB 100"]),
  m("honda", "Win 100", "win-100", 1984, 2004, ["HONDA WIN"]),
  // Yamaha motor
  m("yamaha", "NMAX", "nmax", 2015, null, ["NMAX", "N MAX"]),
  m("yamaha", "Aerox 155", "aerox-155", 2016, null, ["AEROX"]),
  m("yamaha", "Lexi", "lexi", 2018, null, ["LEXI"]),
  m("yamaha", "XMAX", "xmax", 2017, null, ["XMAX", "X MAX"]),
  m("yamaha", "FreeGo", "freego", 2019, null, ["FREEGO", "FREE GO"]),
  m("yamaha", "Gear 125", "gear-125", 2020, null, ["GEAR 125"]),
  m("yamaha", "Fazzio", "fazzio", 2021, null, ["FAZZIO"]),
  m("yamaha", "Fino", "fino", 2007, null, ["FINO"]),
  m("yamaha", "Mio M3", "mio-m3", 2014, null, ["MIO M3", "M3"]),
  m("yamaha", "Mio Z", "mio-z", 2015, 2019, ["MIO Z"]),
  m("yamaha", "Mio J", "mio-j", 2012, 2016, ["MIO J"]),
  m("yamaha", "Mio Soul GT", "mio-soul-gt", 2012, null, ["SOUL GT", "MIO GT"]),
  m("yamaha", "Mio Soul", "mio-soul", 2010, 2012, ["MIO SOUL", "SOUL"]),
  m("yamaha", "Mio Sporty", "mio-sporty", 2003, 2012, [
    "MIO SPORTY",
    "MIO SPORT",
    "MIO SMILE",
    "MIO",
  ]),
  m("yamaha", "Nouvo", "nouvo", 2002, 2013, ["NOUVO"]),
  m("yamaha", "Xeon", "xeon", 2010, 2015, ["XEON"]),
  m("yamaha", "X-Ride", "x-ride", 2013, null, ["XRIDE", "X RIDE"]),
  m("yamaha", "Jupiter MX King", "jupiter-mx-king", 2015, null, ["MX KING", "MXKING", "Y15ZR"]),
  m("yamaha", "Jupiter MX", "jupiter-mx", 2005, 2015, [
    "JUPITER MX",
    "JUP MX",
    "MX 135",
    "MX135",
    "LC135",
    "MX",
  ]),
  m("yamaha", "Jupiter Z", "jupiter-z", 2003, null, [
    "JUPITER Z",
    "JUPZ",
    "JUP Z",
    "JUPITER Z1",
    "Z1",
  ]),
  m("yamaha", "Vega ZR", "vega-zr", 2003, null, ["VEGA ZR", "VEGA R", "VEGA"]),
  m("yamaha", "F1ZR", "f1zr", 1994, 2005, ["F1ZR", "FIZR", "FIZ R", "FORCE 1", "FORCE1"]),
  m("yamaha", "Crypton", "crypton", 1997, 2002, ["CRYPTON"]),
  m("yamaha", "RX-King", "rx-king", 1983, 2009, ["RX KING", "RXKING", "RXK", "RX K"]),
  m("yamaha", "RX-Z", "rx-z", 1985, 2009, ["RXZ", "RX Z"]),
  m("yamaha", "Alfa", "alfa", 1981, 1995, ["ALFA"]),
  m("yamaha", "Scorpio", "scorpio", 2001, 2017, ["SCORPIO"]),
  m("yamaha", "Byson", "byson", 2010, 2019, ["BYSON"]),
  m("yamaha", "Vixion", "vixion", 2007, null, ["VIXION", "V IXION", "NVL", "NVA"]),
  m("yamaha", "R15", "r15", 2014, null, ["R15", "R 15"]),
  m("yamaha", "R25", "r25", 2014, null, ["R25", "R 25"]),
  m("yamaha", "MT-15", "mt-15", 2019, null, ["MT15", "MT 15"]),
  m("yamaha", "MT-25", "mt-25", 2015, null, ["MT25", "MT 25"]),
  m("yamaha", "XSR 155", "xsr-155", 2019, null, ["XSR"]),
  m("yamaha", "WR155", "wr155", 2019, null, ["WR155", "WR 155"]),
  // Suzuki motor
  m("suzuki", "Satria F150", "satria-f150", 2004, null, [
    "SATRIA FU",
    "SATRIA F",
    "SATRIA 150",
    "FU150",
    "FU 150",
  ]),
  m("suzuki", "Satria 2T", "satria-2t", 1997, 2005, [
    "SATRIA 2T",
    "SATRIA 2 T",
    "SATRIA HIU",
    "SATRIA LUMBA",
    "SATRIA",
  ]),
  m("suzuki", "Shogun", "shogun", 1996, 2012, ["SHOGUN"]),
  m("suzuki", "Smash", "smash", 2002, 2017, ["SMASH"]),
  m("suzuki", "Spin", "spin", 2007, 2013, ["SPIN"]),
  m("suzuki", "Skywave", "skywave", 2007, 2013, ["SKYWAVE"]),
  m("suzuki", "Nex II", "nex-ii", 2018, null, ["NEX II", "NEX 2"]),
  m("suzuki", "Nex", "nex", 2011, 2018, ["NEX"]),
  m("suzuki", "Address", "address", 2014, null, ["ADDRESS"]),
  m("suzuki", "Thunder 125", "thunder-125", 2005, 2015, ["THUNDER"]),
  m("suzuki", "GSX-R150", "gsx-r150", 2017, null, ["GSX R150", "GSXR150", "GSX R 150", "GSX-R"]),
  m("suzuki", "GSX-S150", "gsx-s150", 2017, null, ["GSX S150", "GSXS150", "GSX S 150"]),
  m("suzuki", "RGR 150", "rgr-150", 1990, 2003, ["RGR"]),
  m("suzuki", "Tornado", "tornado", 1996, 2003, ["TORNADO"]),
  m("suzuki", "Crystal", "crystal", 1992, 1997, ["CRYSTAL"]),
  m("suzuki", "A100", "a100", 1975, 1995, ["A100", "A 100"]),
  // Kawasaki motor
  m("kawasaki", "Ninja 250", "ninja-250", 2008, null, ["NINJA 250", "NINJA250"]),
  m("kawasaki", "Ninja 150 RR", "ninja-150-rr", 1998, 2015, [
    "NINJA 150",
    "NINJA RR",
    "NINJA SS",
    "NINJA R",
    "NINJA 2T",
    "NINJA",
  ]),
  m("kawasaki", "ZX-25R", "zx-25r", 2020, null, ["ZX25R", "ZX 25R", "ZX 25 R"]),
  m("kawasaki", "Z250", "z250", 2013, null, ["Z250", "Z 250"]),
  m("kawasaki", "KLX 150", "klx-150", 2009, null, ["KLX 150", "KLX150", "KLX"]),
  m("kawasaki", "D-Tracker 150", "d-tracker-150", 2009, null, ["D TRACKER", "DTRACKER"]),
  m("kawasaki", "W175", "w175", 2017, null, ["W175", "W 175"]),
  m("kawasaki", "Athlete", "athlete", 2009, 2013, ["ATHLETE"]),
  m("kawasaki", "Blitz", "blitz", 2004, 2010, ["BLITZ"]),
  m("kawasaki", "Kaze", "kaze", 1996, 2006, ["KAZE"]),
  m("kawasaki", "Edge", "edge", 2007, 2009, ["EDGE"]),
  // Vespa
  m("vespa", "Vespa LX", "lx", 2012, null, ["VESPA LX", "LX 125", "LX 150"]),
  m("vespa", "Vespa Sprint", "sprint", 2014, null, ["SPRINT"]),
  m("vespa", "Vespa Primavera", "primavera", 2014, null, ["PRIMAVERA"]),
  m("vespa", "Vespa S", "s", 2012, null, ["VESPA S"]),
  m("vespa", "Vespa GTS", "gts", 2012, null, ["GTS"]),
  m("vespa", "Vespa PX", "px", 1977, null, ["VESPA PX", "PX 150"]),
  // Mobil
  m("toyota", "Avanza", "avanza", 2003, null, ["AVANZA"], "car"),
  m(
    "toyota",
    "Kijang Innova Reborn",
    "innova-reborn",
    2016,
    null,
    ["INNOVA REBORN", "REBORN"],
    "car",
  ),
  m("toyota", "Innova", "innova", 2004, 2015, ["INNOVA"], "car"),
  m("toyota", "Kijang", "kijang", 1977, 2004, ["KIJANG"], "car"),
  m("toyota", "Calya", "calya", 2016, null, ["CALYA"], "car"),
  m("toyota", "Agya", "agya", 2013, null, ["AGYA"], "car"),
  m("toyota", "Rush", "rush", 2006, null, ["RUSH"], "car"),
  m("toyota", "Fortuner", "fortuner", 2005, null, ["FORTUNER"], "car"),
  m("toyota", "Yaris", "yaris", 2006, null, ["YARIS"], "car"),
  m("toyota", "Vios", "vios", 2003, null, ["VIOS"], "car"),
  m("honda", "Brio", "brio", 2012, null, ["BRIO"], "car"),
  m("honda", "Jazz", "jazz", 2003, 2021, ["JAZZ"], "car"),
  m("honda", "HR-V", "hr-v", 2014, null, ["HRV", "HR V"], "car"),
  m("honda", "Mobilio", "mobilio", 2014, null, ["MOBILIO"], "car"),
  m("daihatsu", "Xenia", "xenia", 2004, null, ["XENIA"], "car"),
  m("daihatsu", "Ayla", "ayla", 2013, null, ["AYLA"], "car"),
  m("daihatsu", "Sigra", "sigra", 2016, null, ["SIGRA"], "car"),
  m("daihatsu", "Terios", "terios", 2006, null, ["TERIOS"], "car"),
  m("daihatsu", "Gran Max", "gran-max", 2007, null, ["GRAN MAX", "GRANMAX", "GRAND MAX"], "car"),
  m("daihatsu", "Luxio", "luxio", 2009, null, ["LUXIO"], "car"),
  m("suzuki", "Ertiga", "ertiga", 2012, null, ["ERTIGA"], "car"),
  m("suzuki", "Carry Pick Up", "carry-pick-up", 2019, null, ["NEW CARRY", "CARRY PICK UP"], "car"),
  m(
    "suzuki",
    "Carry Futura",
    "carry-futura",
    1991,
    2019,
    ["CARRY", "CARY", "FUTURA", "ST100", "ST 100"],
    "car",
  ),
  m("suzuki", "Jimny", "jimny", 1981, null, ["JIMNY", "SJ410", "SJ 410"], "car"),
  m("suzuki", "Katana", "katana", 1988, 2006, ["KATANA"], "car"),
  m("suzuki", "APV", "apv", 2004, null, ["APV"], "car"),
  m("suzuki", "Swift", "swift", 2005, 2017, ["SWIFT"], "car"),
  m("suzuki", "Karimun", "karimun", 1999, null, ["KARIMUN"], "car"),
  m("mitsubishi", "Xpander", "xpander", 2017, null, ["XPANDER"], "car"),
  m("mitsubishi", "Pajero Sport", "pajero-sport", 2008, null, ["PAJERO"], "car"),
  m("mitsubishi", "L300", "l300", 1981, null, ["L300", "L 300"], "car"),
  m("mitsubishi", "Colt Diesel", "colt-diesel", 1985, null, ["COLT DIESEL", "COLT"], "car"),
];

/** "RX KING" → /\bRX[\s-]*KING\b/ (spasi/strip/tanpa pemisah). */
function aliasRegex(alias: string): RegExp {
  const body = alias
    .split(/\s+/)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s-]*");
  return new RegExp(`(?:^|[^A-Z0-9])${body}(?![A-Z0-9])`);
}

const MAKE_HINT: Record<string, RegExp> = {
  honda: /\b(?:HONDA|AHM|HGP)\b/,
  yamaha: /\b(?:YAMAHA|YGP)\b/,
  suzuki: /\b(?:SUZUKI|SGP)\b/,
  kawasaki: /\b(?:KAWASAKI|KGP)\b/,
  vespa: /\b(?:VESPA|PIAGGIO)\b/,
  toyota: /\bTOYOTA\b/,
  daihatsu: /\bDAIHATSU\b/,
  mitsubishi: /\bMITSUBISHI\b/,
};

/** Kata umum yang juga nama model; dihitung hanya bila mereknya disebut. */
const AMBIGUOUS_ALIASES = new Set([
  "GRAND",
  "PRIMA",
  "STAR",
  "ASTREA",
  "MX",
  "Z1",
  "M3",
  "SOUL",
  "ALFA",
  "SPIN",
  "EDGE",
  "TIGER",
  "BLADE",
  "NEX",
  "CRYSTAL",
  "ADV",
  "GTS",
  "SPRINT",
  "CRF",
  "KLX",
  "SUPRA",
  "RUSH",
  "COLT",
]);

const compiled = VEHICLE_MODELS.map((model) => ({
  model,
  patterns: model.aliases.map(aliasRegex),
}));

/**
 * Saran model yang disebut di nama. Satu kata generik (mis. "GRAND", "MX",
 * "STAR") hanya dihitung bila merek motornya juga disebut, supaya tidak
 * menebak dari kata umum.
 */
export function suggestFitments(rawName: string): FitmentSuggestion[] {
  const upper = ` ${rawName.toUpperCase().replace(/\s+/g, " ")} `;
  const found = new Map<string, FitmentSuggestion>();
  const consumed: [number, number][] = [];
  for (const { model, patterns } of compiled) {
    for (let i = 0; i < patterns.length; i++) {
      const alias = model.aliases[i]!;
      if (AMBIGUOUS_ALIASES.has(alias) && !MAKE_HINT[model.make]?.test(upper)) continue;
      const match = patterns[i]!.exec(upper);
      if (!match) continue;
      const start = match.index;
      const end = start + match[0].length;
      // alias yang sudah tertutup alias lebih spesifik (Vario 150 vs Vario) dilewati
      if (consumed.some(([s, e]) => start >= s && end <= e)) continue;
      consumed.push([start, end]);
      const key = `${model.type}:${model.make}:${model.slug}`;
      if (!found.has(key))
        found.set(key, { make_slug: model.make, model_slug: model.slug, vehicle_type: model.type });
      break;
    }
  }
  return [...found.values()];
}
