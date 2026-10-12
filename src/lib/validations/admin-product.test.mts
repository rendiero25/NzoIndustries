import assert from "node:assert/strict";
import test from "node:test";

import {
  bulkActionSchema,
  fitmentSchema,
  productCoreSchema,
  variantSchema,
} from "./admin-product.ts";

const core = {
  name: "Kampas Rem Depan",
  slug: "kampas-rem-depan",
  sku: "KRD-001",
  status: "draft",
  brandId: null,
  categoryIds: [],
  price: "45000",
  compareAtPrice: "",
};

test("product core coerces money and empty optionals", () => {
  const v = productCoreSchema.parse(core);
  assert.equal(v.price, 45000);
  assert.equal(v.compareAtPrice, null);
  assert.equal(v.description ?? null, null);
});

test("compare-at price must exceed price", () => {
  assert.equal(productCoreSchema.safeParse({ ...core, compareAtPrice: "40000" }).success, false);
  assert.equal(productCoreSchema.safeParse({ ...core, compareAtPrice: "50000" }).success, true);
});

test("sku and slug formats follow DB constraints", () => {
  assert.equal(productCoreSchema.safeParse({ ...core, sku: "KR D/1" }).success, false);
  assert.equal(productCoreSchema.safeParse({ ...core, slug: "Kampas Rem" }).success, false);
});

test("variant compare-at needs its own price", () => {
  const base = {
    name: "Merah",
    sku: "KRD-001-M",
    price: "",
    compareAtPrice: "50000",
    weightGrams: "",
    isActive: true,
  };
  assert.equal(variantSchema.safeParse(base).success, false);
  assert.equal(variantSchema.safeParse({ ...base, price: "45000" }).success, true);
});

test("fitment year range and bulk discount shape", () => {
  const id = "0b8a3a52-2f3c-4f50-8a8a-2d5c1b9e7f10";
  assert.equal(
    fitmentSchema.safeParse({ modelId: id, yearStart: 2020, yearEnd: 2018 }).success,
    false,
  );
  assert.equal(
    bulkActionSchema.safeParse({
      action: "discount",
      ids: [id],
      categoryId: null,
      mode: "percent",
      value: 10,
    }).success,
    true,
  );
  assert.equal(bulkActionSchema.safeParse({ action: "publish", ids: [] }).success, false);
});
