import assert from "node:assert/strict";
import test from "node:test";

import { discountPercent, effectivePrice, formatIDR } from "./money.ts";

test("formats rupiah without decimals using id-ID grouping", () => {
  assert.equal(formatIDR(1500000), "Rp 1.500.000");
  assert.equal(formatIDR(0), "Rp 0");
  assert.equal(formatIDR(18000.6), "Rp 18.001");
  assert.equal(formatIDR(Number.NaN), "Rp 0");
});

test("discount percent rounds down and ignores invalid compare-at", () => {
  assert.equal(discountPercent(55000, 62000), 11);
  assert.equal(discountPercent(250000, 299000), 16);
  assert.equal(discountPercent(100, 100), null);
  assert.equal(discountPercent(100, 90), null);
  assert.equal(discountPercent(100, null), null);
  assert.equal(discountPercent(999, 1000), null);
});

test("variant price overrides product price only when set (D-18)", () => {
  const product = { price: 75000, compare_at_price: null };
  assert.deepEqual(effectivePrice(product, { price: 65000, compare_at_price: null }), {
    price: 65000,
    compareAt: null,
  });
  assert.deepEqual(effectivePrice(product, { price: null, compare_at_price: null }), {
    price: 75000,
    compareAt: null,
  });
  assert.deepEqual(effectivePrice(product), { price: 75000, compareAt: null });
});
