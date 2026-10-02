/**
 * Codemod sekali jalan (Fase 2): ganti palet GeekyTech hardcode di kelas
 * Tailwind arbitrary ke token NZO (design-system.md §2). Mekanis dan bisa
 * diulang (idempotent). Hex di luar tabel dilaporkan, tidak diubah.
 *
 *   node scripts/codemod-geekytech-palette.mjs src
 */
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? "src";

// hex (lowercase) -> token per jenis utilitas
const FG = { default: "foreground", bg: "primary" };
const BORDER = { default: "border", bg: "steel-200", text: "steel-200" };
const MUTED_FG = { default: "muted-foreground", bg: "steel-500", border: "steel-500" };
const STEEL700 = { default: "steel-700" };
const MUTED = { default: "muted", text: "steel-50", border: "border" };
const ORANGE = { default: "foreground", bg: "primary", ring: "ring", outline: "ring" };
const ORANGE_HOVER = { default: "steel-700" };
const ORANGE_SOFT = { default: "muted" };

const MAP = {
  "1d1d1f": FG,
  "2a2a2c": FG,
  111111: FG,
  333333: FG,
  121212: FG,
  e0e0e0: BORDER,
  f0f0f0: BORDER,
  cccccc: BORDER,
  e5e5e5: BORDER,
  d2d2d7: BORDER,
  e8e8ed: BORDER,
  "7a7a7a": MUTED_FG,
  "6e6e73": MUTED_FG,
  "8e8e93": MUTED_FG,
  a0a0a0: MUTED_FG,
  "86868b": MUTED_FG,
  c8c8c8: MUTED_FG,
  999999: MUTED_FG,
  "5c5c5c": STEEL700,
  "3d3d3d": STEEL700,
  424245: STEEL700,
  f5f5f7: MUTED,
  fafafa: MUTED,
  fafafc: MUTED,
  f8f8f6: MUTED,
  f2f2f2: MUTED,
  ea5329: ORANGE,
  ff7a52: { default: "ring" },
  d44820: ORANGE_HOVER,
  fff0e8: ORANGE_SOFT,
  // pass 2: tint oranye, netral hangat (krem) GeekyTech, abu lain
  fff8f5: ORANGE_SOFT,
  faf5f3: ORANGE_SOFT,
  f0e8e4: ORANGE_SOFT,
  eadfd8: BORDER,
  ffad88: { default: "steel-200" },
  ffb4a1: { default: "steel-200" },
  f4f1ea: MUTED,
  f5f4f0: MUTED,
  fafaf8: MUTED,
  f3f3f1: MUTED,
  f5f5f3: MUTED,
  f1f1ef: MUTED,
  faf8f4: MUTED,
  ececea: BORDER,
  ece8e0: BORDER,
  e8e4dc: BORDER,
  d4d0c8: BORDER,
  d4d4d4: BORDER,
  d0d0d0: BORDER,
  c0c0c0: BORDER,
  c8c8cc: BORDER,
  ececec: BORDER,
  e8e8e8: BORDER,
  b0b0b0: MUTED_FG,
  "9a9a9a": MUTED_FG,
  "9a9590": MUTED_FG,
  777773: MUTED_FG,
  "1a1a1a": FG,
  272729: { default: "asphalt" },
  252527: { default: "asphalt" },
  333335: FG,
  303030: FG,
  d32f2f: { default: "destructive" },
  b45309: { default: "warning" },
  "20b358": { default: "success" },
};

const UTIL =
  "bg|text|border(?:-[trblxy])?|from|to|via|fill|stroke|ring|outline|divide|decoration|placeholder|caret|accent|shadow";
const CLASS_RE = new RegExp(`\\b(${UTIL})-\\[#([0-9a-fA-F]{6})\\]`, "g");

const stats = { files: 0, replaced: 0 };
const leftovers = new Map();

function tokenFor(util, hex) {
  const entry = MAP[hex];
  if (!entry) return null;
  const kind = util.startsWith("border") ? "border" : util;
  return entry[kind] ?? entry.default;
}

function transform(src) {
  let out = src.replace(CLASS_RE, (match, util, hexRaw) => {
    const token = tokenFor(util, hexRaw.toLowerCase());
    if (!token) {
      leftovers.set(hexRaw.toLowerCase(), (leftovers.get(hexRaw.toLowerCase()) ?? 0) + 1);
      return match;
    }
    stats.replaced++;
    return `${util}-${token}`;
  });

  // Literal hex brand GeekyTech di style inline / template email.
  out = out.replace(/#ea5329/gi, () => (stats.replaced++, "#000000"));
  out = out.replace(/#d44820/gi, () => (stats.replaced++, "#3A3D42"));

  // Gaya tipografi ala Apple dari starter.
  out = out.replace(/\s?tracking-\[-0\.(374|224|28|12|16|2)px\]/g, () => (stats.replaced++, ""));
  out = out.replace(/\btext-\[17px\]/g, () => (stats.replaced++, "text-base"));
  return out;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(entry.name) && !p.includes("legacy-supabase")) {
      const src = fs.readFileSync(p, "utf8");
      const next = transform(src);
      if (next !== src) {
        fs.writeFileSync(p, next);
        stats.files++;
      }
    }
  }
}

walk(root);
console.log(`files changed: ${stats.files}, replacements: ${stats.replaced}`);
const rest = [...leftovers.entries()].sort((a, b) => b[1] - a[1]);
console.log(`hex tidak dipetakan (${rest.length}):`, rest.map(([h, n]) => `#${h}×${n}`).join(" "));
