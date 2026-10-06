import assert from "node:assert/strict";
import test from "node:test";

import { detectBrand } from "./brands.ts";
import { suggestCategory } from "./categories.ts";
import { cleanProductName } from "./clean-name.ts";
import {
  apiItemToGroup,
  fetchAllItemGroups,
  type JubelioApiItemGroup,
  type JubelioSource,
} from "./jubelio-api.ts";
import { mapJubelioGroups, parseJubelioExport, type SheetRow } from "./jubelio-export.ts";
import { createSkuAllocator, isValidSku, normalizeSku, parentSkuFor } from "./normalize-sku.ts";
import { mapNzoTemplate } from "./nzo-template.ts";
import { productSlug, shortHash, slugify } from "./slug.ts";
import { suggestFitments } from "./vehicles.ts";

test("normalizeSku makes export SKUs schema-safe", () => {
  assert.equal(normalizeSku("STANG-SEKER-GL100/CB100-NPP"), "STANG-SEKER-GL100-CB100-NPP");
  assert.equal(normalizeSku("BOHLAM W16W 12V 16W OSRAM"), "BOHLAM-W16W-12V-16W-OSRAM");
  assert.equal(normalizeSku("GREASE-NAPLE-90°-WIPRO"), "GREASE-NAPLE-90-WIPRO");
  assert.equal(normalizeSku("14401-K44-V81 (A56)"), "14401-K44-V81-A56");
  assert.equal(
    normalizeSku("KARET+BOSH-SHOCKBREAKER-ALFA-HRD"),
    "KARET-BOSH-SHOCKBREAKER-ALFA-HRD",
  );
  assert.equal(normalizeSku('VELCRO-GOLD-5"-8HOLE-FINISH-P100'), "VELCRO-GOLD-5-8HOLE-FINISH-P100");
  assert.equal(normalizeSku(" A\nB "), "A-B");
  for (const s of ["14D-F8395-00-GUDANG GANG 6", "RING-PISTON-GRAND-0.50-NPP", "x/y/z"]) {
    assert.ok(isValidSku(normalizeSku(s)), s);
  }
});

test("SKU allocator suffixes collisions after normalization", () => {
  const a = createSkuAllocator();
  assert.deepEqual(a.allocate("AB/CD"), { sku: "AB-CD", changed: true, collided: false });
  assert.deepEqual(a.allocate("AB CD"), { sku: "AB-CD-2", changed: true, collided: true });
  assert.equal(a.allocate("°°°"), null);
});

test("parentSkuFor takes the shared prefix or falls back to -GRP", () => {
  assert.equal(parentSkuFor(["1S7-F3391-00-P2-GUDANG", "1S7-F3391-00-P3-GUDANG"]), "1S7-F3391-00");
  assert.equal(
    parentSkuFor(["RADIATOR-UMA-LC135-02R00070", "RADIATOR-UMA-Y15ZR-02R00050"]),
    "RADIATOR-UMA",
  );
  assert.equal(parentSkuFor(["ABC", "XYZ"]), "ABC-GRP");
  // prefix "1S7-E2121-00" sama dengan salah satu SKU varian, jadi dipotong lagi
  assert.equal(parentSkuFor(["1S7-E2121-00", "1S7-E2121-00-E08"]), "1S7-E2121");
  assert.equal(parentSkuFor(["AB-1", "AB-2"]), "AB-1-GRP");
});

test("cleanProductName removes synonyms, aliases, noise and part numbers", () => {
  const r = cleanProductName(
    "011-437-0705 STANG SETANG SEHER SEKER PISTON CONNECTING ROD CONROD KIT HONDA GL100 B100 GL CB 100 ORI ORIGINAL NPP ASLI",
  );
  assert.equal(
    r.name,
    "011-437-0705 Stang Seher Piston Connecting Rod Conrod Kit Honda GL100 B100 GL CB 100 NPP",
  );

  const rx = cleanProductName(
    "92907-14200 WASHER RING AS RODA DEPAN BELAKANG RXK RX-K RXKING RX KING RX-KING ORI ORIGINAL YAMAHA YGP ASLI",
  );
  assert.deepEqual(rx.partNumbers, ["92907-14200"]);
  assert.equal(rx.name, "Washer Ring As Roda Depan Belakang RXK RX-King Yamaha YGP");

  const honda = cleanProductName(
    "52400-K25-901 SUSPENSI SUSPENSION PEREDAM KEJUT SHOCK SKOK SOKSKOK BLK BLKG BELAKANG BEAT POP SCOOPY F1 VARIO 110 ESP FI INJEKSI INJECTION ORI ORIGINAL HONDA AHM HGP ASLI",
  );
  assert.deepEqual(honda.partNumbers, ["52400-K25-901"]);
  assert.ok(
    honda.name.startsWith(
      "Suspensi Peredam Kejut Shock Blk BeAT Pop Scoopy F1 Vario 110 ESP FI Injeksi",
    ),
    honda.name,
  );
  assert.ok(honda.name.length <= 90);

  const noise = cleanProductName(
    "HARGA PER 5 BIJI BAUT RIVET KLIP CLIP CENGKEH PLASTIK NOK KNOK DOOR TRIM PINTU MOBIL UNIVERSAL COKLAT",
  );
  assert.ok(noise.name.startsWith("Baut Rivet Klip Clip Cengkeh"), noise.name);

  const nmax = cleanProductName(
    "2DP-F7111-00 SETANDAR STANDAR TENGAH STANDART 2 JAGANG NMAX N-MAX N MAX ORI ORIGINAL YGP ASLI",
  );
  assert.equal(nmax.name, "Setandar Tengah 2 Jagang NMAX YGP");
});

test("cleanProductName respects max length at word boundaries", () => {
  const long =
    "KAMPAS ".repeat(5) +
    "REM CAKRAM DEPAN VIXION VEGA ZR JUPITER Z1 ROBOT MIO J MIO GT SOUL GT FINO 125 XRIDE AEROX NMAX LEXI";
  const r = cleanProductName(long, { maxLength: 40 });
  assert.ok(r.name.length <= 40);
  assert.ok(!r.name.endsWith(" "));
});

test("detectBrand prefers genuine-parts markers, then the ORI tail", () => {
  assert.equal(detectBrand("COVER BODY XRIDE ORI ORIGINAL YAMAHA YGP ASLI")?.slug, "yamaha-ygp");
  assert.equal(detectBrand("GEAR STARTER BEAT ORIGINAL HONDA AHM HGP ASLI")?.slug, "honda-hgp");
  assert.equal(detectBrand("RING PISTON NINJA ORI ORIGINAL NPP ASLI")?.slug, "npp");
  assert.equal(detectBrand("BUSI MOTOR NGK G-POWER NINJA 150")?.slug, "ngk");
  // "WIN" di badan nama tidak dianggap merek
  assert.equal(detectBrand("KABEL GAS HONDA WIN 100"), null);
});

test("suggestCategory maps common part names", () => {
  assert.equal(suggestCategory("KAMPAS REM CAKRAM DEPAN VIXION"), "rem-motor");
  assert.equal(suggestCategory("RING PISTON ONLY SEHER NINJA"), "mesin-motor");
  assert.equal(suggestCategory("OIL SEAL AS RODA"), "baut-seal-motor");
  assert.equal(suggestCategory("FUEL FILTER SARINGAN BENSIN SUZUKI CARRY"), "filter-mobil");
  assert.equal(suggestCategory("[BPOM] CREAM KETIAK"), "lainnya");
  assert.equal(suggestCategory("KUNCI SOK SET 24 PCS"), "peralatan");
  assert.equal(suggestCategory("KAMPAS KOPLING SATRIA"), "transmisi-motor");
  assert.equal(suggestCategory("COVER TUTUP BODI VARIO 150 LED"), "aksesoris-motor");
  assert.equal(suggestCategory("XYZ 123"), "belum-dikategorikan");
});

test("suggestFitments picks the most specific model and ignores generic words without a make", () => {
  const vario = suggestFitments("COVER BODY VARIO 150 LED 2015 ORI HONDA AHM HGP");
  assert.deepEqual(
    vario.map((f) => f.model_slug),
    ["vario-150"],
  );
  const rx = suggestFitments("WASHER RX KING RXK");
  assert.deepEqual(
    rx.map((f) => f.model_slug),
    ["rx-king"],
  );
  assert.deepEqual(suggestFitments("KABEL STAR UNIVERSAL"), []);
  assert.deepEqual(
    suggestFitments("GASKET HONDA GRAND").map((f) => f.model_slug),
    ["astrea-grand"],
  );
  const car = suggestFitments("FUEL FILTER SUZUKI CARRY 1.0 ST100 JIMNY KATANA");
  assert.deepEqual(car.map((f) => f.model_slug).sort(), ["carry-futura", "jimny", "katana"]);
});

test("slug helpers are stable and URL-safe", () => {
  assert.equal(slugify("Kampas Rem & Seal 1.5"), "kampas-rem-dan-seal-1-5");
  assert.equal(shortHash("ABC"), shortHash("ABC"));
  assert.match(productSlug("Kampas Rem", "SKU-1"), /^kampas-rem-[0-9a-z]{6}$/);
});

const SHEET: SheetRow[] = [
  ["RCMOTOR"],
  ["Daftar Harga"],
  ["NAMA BARANG", "SKU", null, "VARIANT", "FOTO", null, null, "Harga Default", "SHOPEE - 1 - a"],
  [
    "002R00050 RADIATOR ASSY YAMAHA MX KING ORI ORIGINAL UMA RACING ASLI",
    "RADIATOR-UMA-LC135-02R00070",
    null,
    "LC135",
    null,
    null,
    null,
    1261884,
    1300000,
  ],
  [null, "RADIATOR-UMA-Y15ZR-02R00050", null, "Y15ZR", null, null, null, 1347878, null],
  ["BOHLAM OSRAM", "BOHLAM W16W 12V 16W OSRAM", null, null, null, null, null, "25.000", null],
  ["TANPA HARGA", "X-1", null, null, null, null, null, 0, null],
];

test("parse + map Jubelio export groups variants and normalizes", () => {
  const groups = parseJubelioExport(SHEET);
  assert.equal(groups.length, 3);
  assert.equal(groups[0]!.rows.length, 2);
  assert.deepEqual(groups[0]!.rows[0]!.marketplacePrices, { "SHOPEE - 1 - a": 1300000 });

  const { rows, summary } = mapJubelioGroups(groups);
  assert.equal(summary.products, 3);
  assert.equal(summary.valid, 2);
  assert.equal(summary.invalid, 1);
  assert.equal(summary.variants, 2);

  const radiator = rows[0]!.mapped!;
  assert.equal(radiator.sku, "RADIATOR-UMA");
  assert.equal(radiator.source_sku, null);
  assert.equal(radiator.price, 1261884);
  assert.equal(radiator.variants[0]!.price, null);
  assert.equal(radiator.variants[1]!.price, 1347878);
  assert.equal(radiator.variants[1]!.name, "Y15ZR");
  assert.equal(radiator.brand_slug, "uma-racing");
  assert.equal(radiator.search_keywords, SHEET[3]![0]);

  const bulb = rows[1]!.mapped!;
  assert.equal(bulb.sku, "BOHLAM-W16W-12V-16W-OSRAM");
  assert.equal(bulb.source_sku, "BOHLAM W16W 12V 16W OSRAM");
  assert.equal(bulb.price, 25000);
  assert.equal(rows[1]!.warnings.length, 1);

  assert.equal(rows[2]!.status, "invalid");
});

test("Jubelio API items reuse the export mapping pipeline", async () => {
  const fixture: JubelioApiItemGroup[] = [
    {
      item_group_id: 1,
      item_group_name: "KAMPAS REM DEPAN VARIO 125 ORI ORIGINAL HONDA AHM HGP ASLI",
      variants: [
        { item_id: 11, item_code: "06455-K59-A71", sell_price: 85000, variation_values: null },
      ],
    },
    {
      item_group_id: 2,
      item_group_name: "SPION NMAX",
      variants: [
        {
          item_id: 21,
          item_code: "SPION-NMAX-HTM",
          sell_price: 50000,
          variation_values: [{ label: "Warna", value: "HITAM" }],
        },
        {
          item_id: 22,
          item_code: "SPION-NMAX-MRH",
          sell_price: 55000,
          variation_values: [{ label: "Warna", value: "MERAH" }],
        },
      ],
    },
  ];
  const pages: JubelioSource = {
    async listItemGroups(page, pageSize) {
      return {
        items: fixture.slice((page - 1) * pageSize, page * pageSize),
        total: fixture.length,
      };
    },
  };
  const items = await fetchAllItemGroups(pages, 1);
  assert.equal(items.length, 2);
  const { rows, summary } = mapJubelioGroups(items.map((it, i) => apiItemToGroup(it, i + 1)));
  assert.equal(summary.valid, 2);
  assert.equal(rows[0]!.mapped!.brand_slug, "honda-hgp");
  assert.equal(rows[1]!.mapped!.sku, "SPION-NMAX");
  assert.deepEqual(
    rows[1]!.mapped!.variants.map((v) => [v.name, v.price]),
    [
      ["Hitam", null],
      ["Merah", 55000],
    ],
  );
});

test("parseJubelioExport rejects other spreadsheets", () => {
  assert.throws(() => parseJubelioExport([["sku", "nama"]]), /NAMA BARANG/);
});

test("NZO template validates and maps rows", () => {
  const { rows, summary } = mapNzoTemplate(
    [
      ["sku", "nama", "harga", "harga_coret", "berat_gram", "stok", "kategori", "brand"],
      ["ABC-1", "Kampas Rem Vario 125", "45000", "52000", "200", "10", "rem-motor", "Aspira"],
      ["ABC-2", "Coret salah", "45000", "40000", "", "", "", ""],
      ["ABC 3", "Kategori asing", 10000, null, null, null, "tidak-ada", null],
    ],
    new Set(["rem-motor"]),
  );
  assert.equal(summary.valid, 2);
  assert.equal(summary.invalid, 1);
  assert.equal(rows[0]!.mapped!.stock, 10);
  assert.equal(rows[0]!.mapped!.brand_slug, "aspira");
  assert.deepEqual(
    rows[0]!.mapped!.fitment_suggestions.map((f) => f.model_slug),
    ["vario-125"],
  );
  assert.equal(rows[1]!.error, "Harga coret harus lebih besar dari harga");
  assert.equal(rows[2]!.mapped!.sku, "ABC-3");
  assert.ok(rows[2]!.warnings.some((w) => w.includes("tidak ada")));
});
