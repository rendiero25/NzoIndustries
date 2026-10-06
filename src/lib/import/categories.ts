/**
 * Pohon kategori katalog NZO (diterapkan lewat migration data) dan aturan
 * saran kategori dari nama produk. Satu kategori per produk saat import;
 * admin bisa menambah kategori lain di Fase 8. D-07: non-otomotif terpisah.
 */
export type CategoryNode = {
  slug: string;
  name: string;
  isAutomotive?: boolean;
  isActive?: boolean;
  children?: CategoryNode[];
};

export const CATEGORY_TREE: CategoryNode[] = [
  {
    slug: "motor",
    name: "Motor",
    children: [
      { slug: "mesin-motor", name: "Mesin" },
      { slug: "rem-motor", name: "Pengereman" },
      { slug: "lampu-motor", name: "Kelistrikan & lampu" },
      { slug: "suspensi-motor", name: "Suspensi & kaki-kaki" },
      { slug: "transmisi-motor", name: "Transmisi, CVT & kopling" },
      { slug: "bahan-bakar-motor", name: "Karburator & injeksi" },
      { slug: "filter-motor", name: "Filter" },
      { slug: "oli-motor", name: "Oli & cairan" },
      { slug: "ban-velg-motor", name: "Ban, velg & roda" },
      { slug: "knalpot-motor", name: "Knalpot" },
      { slug: "baut-seal-motor", name: "Baut, mur & seal" },
      { slug: "aksesoris-motor", name: "Body & aksesoris" },
    ],
  },
  {
    slug: "mobil",
    name: "Mobil",
    children: [
      { slug: "mesin-mobil", name: "Mesin" },
      { slug: "rem-mobil", name: "Pengereman" },
      { slug: "lampu-mobil", name: "Kelistrikan & lampu" },
      { slug: "kaki-kaki-mobil", name: "Kaki-kaki" },
      { slug: "filter-mobil", name: "Filter" },
      { slug: "oli-mobil", name: "Oli & cairan" },
      { slug: "wiper", name: "Wiper" },
      { slug: "aksesoris-interior", name: "Body & interior" },
    ],
  },
  {
    slug: "non-otomotif",
    name: "Non-otomotif",
    isAutomotive: false,
    children: [
      { slug: "perawatan-kebersihan", name: "Perawatan & kebersihan", isAutomotive: false },
      { slug: "peralatan", name: "Peralatan", isAutomotive: false },
      { slug: "lainnya", name: "Lainnya", isAutomotive: false },
    ],
  },
  // Wadah internal hasil import yang belum cocok aturan; tidak tampil publik.
  { slug: "belum-dikategorikan", name: "Belum dikategorikan", isActive: false },
];

type Group =
  | "mesin"
  | "rem"
  | "lampu"
  | "suspensi"
  | "transmisi"
  | "bahan-bakar"
  | "filter"
  | "oli"
  | "ban"
  | "knalpot"
  | "baut"
  | "body"
  | "wiper";

const MOTOR_SLUG: Record<Group, string> = {
  mesin: "mesin-motor",
  rem: "rem-motor",
  lampu: "lampu-motor",
  suspensi: "suspensi-motor",
  transmisi: "transmisi-motor",
  "bahan-bakar": "bahan-bakar-motor",
  filter: "filter-motor",
  oli: "oli-motor",
  ban: "ban-velg-motor",
  knalpot: "knalpot-motor",
  baut: "baut-seal-motor",
  body: "aksesoris-motor",
  wiper: "aksesoris-motor",
};

const CAR_SLUG: Record<Group, string> = {
  mesin: "mesin-mobil",
  rem: "rem-mobil",
  lampu: "lampu-mobil",
  suspensi: "kaki-kaki-mobil",
  transmisi: "mesin-mobil",
  "bahan-bakar": "mesin-mobil",
  filter: "filter-mobil",
  oli: "oli-mobil",
  ban: "kaki-kaki-mobil",
  knalpot: "mesin-mobil",
  baut: "mesin-mobil",
  body: "aksesoris-interior",
  wiper: "wiper",
};

const w = (words: string) => new RegExp(`\\b(?:${words})\\b`);

/** Non-otomotif & perawatan: kategori tetap, tidak tergantung motor/mobil. */
const FIXED_RULES: [RegExp, string][] = [
  [
    w(
      "BPOM|KRIM|CREAM|SKINCARE|PEMUTIH|SERUM|LOTION|PARFUM|LIPSTIK|NIACINAMIDE|SABUN MANDI|MASKER WAJAH",
    ),
    "lainnya",
  ],
  [
    w("SAMPO|SHAMPOO|WAX|COATING|MICROFIBER|PEMBERSIH|CLEANER|SEMIR|POLES|KIT POLISH"),
    "perawatan-kebersihan",
  ],
  [
    w(
      "OBENG|TANG|TREKER|TRACKER|TRAKER|PULLER|TOOLKIT|TOOL KIT|TOOLS?|KUNCI (?:SOK|RING|PAS|INGGRIS|T|L|BUSI|RODA)|SET KUNCI|KUNCI SET|KOMPRESOR",
    ),
    "peralatan",
  ],
];

/** Urutan penting: yang spesifik dulu. */
const GROUP_RULES: [RegExp, Group][] = [
  [w("WIPER"), "wiper"],
  [w("FILTER|SARINGAN"), "filter"],
  [
    w("OIL SEAL|SEAL|SIL|O-?RING|BAUT|BOLT|MUR|NUT|WASHER|RIVET|KLIP|CLIP|GROMMET|COLLAR|DOWEL"),
    "baut",
  ],
  [
    w("KAMPAS REM|REM|DISCPAD|DISKPAD|DISPAD|CAKRAM|PIRINGAN|KALIPER|CALIPER|BRAKE|MASTER REM"),
    "rem",
  ],
  [
    w(
      "KUNCI KONTAK|LAMPU|LAMP|BOHLAM|HEADLAMP|HEADLIGHT|STOPLAMP|SEIN|REFLEKTOR|REFLECTOR|AKI|BATTERY|BATERAI|KIPROK|REGULATOR|RECTIFIER|SPULL?|SPOOL|KOIL|COIL|CDI|ECU|ECM|BUSI|SPARK ?PLUG|WIRING|SOKET|SAKLAR|SAKELAR|SWITCH|SWIT|KLAKSON|HORN|RELAY|SEKRING|FUSE|SENSOR|DINAMO|STARTER|STATER|SPEEDOMETER|SPEEDO|SPIDO|SPEDO|SPIDOMETER|SPEDOMETER|IMMOBILIZER|TPS",
    ),
    "lampu",
  ],
  [
    w(
      "KARBURATOR|KARBU|CARBU|MAIN ?JET|MAINJET|PILOT ?JET|SPUYER|INJEKTOR|INJECTOR|THROTTLE BODY|FUEL|BENSIN|TANGKI|KRAN|KERAN|INTAKE|MANIFOLD|SKEP|NEEDLE JET|JARUM SKEP",
    ),
    "bahan-bakar",
  ],
  [
    w(
      "PISTON|SEHER|SEKER|BLOK|BLOCK|SILINDER|CYLINDER|HEAD|KLEP|VALVE|NOKEN|CAMSHAFT|KRUK ?AS|CRANKSHAFT|CONROD|CONNECTING ROD|PAKING|GASKET|PERPAK|TIMING|KAMPRAT|RADIATOR|WATER PUMP|POMPA|BEARING|LAHER|LAKER|MESIN|ENGINE|TENSIONER",
    ),
    "mesin",
  ],
  [
    w(
      "KOPLING|COPLING|CLUTCH|GEAR|GER|GIR|GIGI|RANTAI|RANTE|CHAIN|SPROCKET|GEARSET|V-?BELT|VAN ?BELT|ROLLER|ROLER|PULLY|PULLEY|PULI|CVT|MANGKOK|KAMPAS GANDA|KIPAS|SLIDING|SHEAVE|TRANSMISI|PERSNELING|GEARBOX",
    ),
    "transmisi",
  ],
  [
    w(
      "SHOCK|SKOK|SOK|SUSPENSI|SUSPENSION|ABSORBER|SHOCKBREAKER|PEREDAM|SWING ?ARM|AS RODA|FORK|KOMSTIR|COMSTIR|STEERING|SEGITIGA",
    ),
    "suspensi",
  ],
  [w("BAN|TIRE|TYRE|VELG|VELK|PELEK|JARI-JARI|RUJI|NAP|TROMOL|PENTIL"), "ban"],
  [w("KNALPOT|MUFFLER|MUFLER|SILENCER|EXHAUST"), "knalpot"],
  [w("OLI|OIL|PELUMAS|GREASE|GEMUK|MINYAK REM|BRAKE FLUID|COOLANT|AIR RADIATOR|YAMALUBE"), "oli"],
  [
    w(
      "COVER|BODY|BODI|SPAKBOR|SLEBOR|SELEBOR|SEPAKBOR|MIKA|MICA|KACA|SPION|SEPION|MIRROR|JOK|SADEL|STIKER|STICKER|STRIPING|LIST|EMBLEM|LOGO|HANDGRIP|HANFAT|HANDFAT|HANDLE|HANDEL|FOOTREST|FOOTSTEP|STEP|BEHEL|BEGEL|STANDAR|STANDART|JAGANG|DEK|LEGSHIELD|TAMENG|BATOK|VISOR|WINDSHIELD|KARPET|SARUNG|BOX|BAGASI|TUTUP|SAYAP|KUNCI|KABEL|CABLE|STANG|SETANG|DOOR TRIM",
    ),
    "body",
  ],
];

const CAR_HINT = w(
  "MOBIL|AVANZA|XENIA|INNOVA|KIJANG|CARRY|CARY|JIMNY|KATANA|APV|ERTIGA|BRIO|JAZZ|CIVIC|GRAND ?MAX|GRANMAX|LUXIO|TERIOS|RUSH|AYLA|AGYA|CALYA|SIGRA|XPANDER|PAJERO|L300|COLT|PANTHER|ELF|FORTUNER|HILUX|YARIS|VIOS|SWIFT|SPLASH|KARIMUN|ESCUDO|VITARA|ST100|SJ ?410|TRUK|TRUCK",
);

export function isCarProduct(rawName: string): boolean {
  return CAR_HINT.test(rawName.toUpperCase());
}

/** Kata pertama yang jelas bagian body (mis. "COVER HANDLEBAR … KOPLING" tetap body). */
const LEAD_BODY = new Set([
  "COVER",
  "TUTUP",
  "LIST",
  "STIKER",
  "STICKER",
  "STRIPING",
  "BODY",
  "BODI",
  "SLEBOR",
  "SPAKBOR",
  "SELEBOR",
  "SPION",
  "SEPION",
  "JOK",
  "KARPET",
  "BATOK",
  "LEGSHIELD",
  "EMBLEM",
  "SARUNG",
  "DEK",
]);

export function suggestCategory(rawName: string): string {
  const upper = rawName.toUpperCase();
  for (const [re, slug] of FIXED_RULES) if (re.test(upper)) return slug;
  const car = isCarProduct(upper);
  const lead = upper
    .replace(/\b(?:\d{5}-[A-Z0-9-]+|[0-9A-Z]{3}-[A-Z0-9]{5}-[0-9A-Z-]+)\b/g, " ")
    .match(/[A-Z]{2,}/)?.[0];
  if (lead && LEAD_BODY.has(lead)) return car ? CAR_SLUG.body : MOTOR_SLUG.body;
  for (const [re, group] of GROUP_RULES) {
    if (re.test(upper)) return car ? CAR_SLUG[group] : MOTOR_SLUG[group];
  }
  return "belum-dikategorikan";
}

export function flattenCategoryTree(): {
  slug: string;
  name: string;
  parentSlug: string | null;
  isAutomotive: boolean;
  isActive: boolean;
  sortOrder: number;
}[] {
  const out: ReturnType<typeof flattenCategoryTree> = [];
  CATEGORY_TREE.forEach((node, i) => {
    const auto = node.isAutomotive ?? true;
    out.push({
      slug: node.slug,
      name: node.name,
      parentSlug: null,
      isAutomotive: auto,
      isActive: node.isActive ?? true,
      sortOrder: i + 1,
    });
    node.children?.forEach((c, j) =>
      out.push({
        slug: c.slug,
        name: c.name,
        parentSlug: node.slug,
        isAutomotive: c.isAutomotive ?? auto,
        isActive: c.isActive ?? true,
        sortOrder: j + 1,
      }),
    );
  });
  return out;
}
