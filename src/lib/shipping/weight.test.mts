import assert from "node:assert/strict";
import test from "node:test";

import { chargeableUnitGrams, parcelGrams, volumetricGrams } from "./weight.ts";

const item = (over: Partial<Parameters<typeof chargeableUnitGrams>[0]> = {}) => ({
  weightGrams: null,
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  quantity: 1,
  ...over,
});

test("volumetric weight uses p×l×t/6000 in cm, rounded up to grams", () => {
  // 30×20×10 cm = 6000 cm³ → 1 kg
  assert.equal(volumetricGrams(300, 200, 100), 1000);
  assert.equal(volumetricGrams(100, 100, 100), 167);
});

test("chargeable weight is the larger of actual and volumetric", () => {
  assert.equal(
    chargeableUnitGrams(
      item({ weightGrams: 400, lengthMm: 300, widthMm: 200, heightMm: 100 }),
      1000,
    ),
    1000,
  );
  assert.equal(
    chargeableUnitGrams(
      item({ weightGrams: 2500, lengthMm: 300, widthMm: 200, heightMm: 100 }),
      1000,
    ),
    2500,
  );
});

test("missing weight falls back to the default", () => {
  assert.equal(chargeableUnitGrams(item(), 1000), 1000);
  assert.equal(chargeableUnitGrams(item({ weightGrams: 0 }), 750), 750);
});

test("incomplete dimensions ignore volumetric weight", () => {
  assert.equal(
    chargeableUnitGrams(item({ weightGrams: 300, lengthMm: 500, widthMm: 500 }), 1000),
    300,
  );
});

test("parcel weight multiplies by quantity and never returns zero", () => {
  assert.equal(
    parcelGrams(
      [item({ weightGrams: 200, quantity: 3 }), item({ weightGrams: 500, quantity: 1 })],
      1000,
    ),
    1100,
  );
  assert.equal(parcelGrams([], 1000), 1);
});
