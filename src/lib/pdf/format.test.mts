import assert from "node:assert/strict";
import test from "node:test";

import {
  addressLines,
  documentFileName,
  formatWeight,
  INVOICE_NUMBER_RE,
  ORDER_NUMBER_RE,
  packageWeightGrams,
  rupiah,
} from "./format.ts";

test("rupiah rapat tanpa desimal", () => {
  assert.equal(rupiah(150000), "Rp150.000");
  assert.equal(rupiah(0), "Rp0");
  assert.equal(rupiah(-2500), "-Rp2.500");
});

test("berat paket memakai default untuk item tanpa berat", () => {
  const g = packageWeightGrams(
    [
      { quantity: 2, weightGrams: 300 },
      { quantity: 1, weightGrams: null },
    ],
    1000,
  );
  assert.equal(g, 1600);
  assert.equal(formatWeight(800), "800 g");
  assert.equal(formatWeight(1600), "1,6 kg");
});

test("format nomor invoice & pesanan", () => {
  assert.ok(INVOICE_NUMBER_RE.test("INV/2026/000123"));
  assert.ok(!INVOICE_NUMBER_RE.test("INV-2026-1"));
  assert.ok(ORDER_NUMBER_RE.test("NZO-261012-F5C80D"));
  assert.ok(!ORDER_NUMBER_RE.test("NZO-261012-F5C80D,../x"));
  assert.equal(documentFileName("INV/2026/000123"), "INV-2026-000123");
});

test("alamat jadi baris cetak", () => {
  assert.deepEqual(
    addressLines({
      full_address: "Jl. Mawar 1",
      district: "Coblong",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40132",
    }),
    ["Jl. Mawar 1", "Coblong, Bandung", "Jawa Barat 40132"],
  );
  assert.deepEqual(addressLines({}), []);
});
