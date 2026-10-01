import assert from "node:assert/strict";
import test from "node:test";

import { buildCloudinaryFolder, isCloudinarySection, isNzoPublicId } from "./folders.ts";

test("product folder is scoped under nzo/products/{sku}", () => {
  assert.equal(buildCloudinaryFolder("products", "NZO-001"), "nzo/products/NZO-001");
});

test("other sections live directly under nzo/", () => {
  assert.equal(buildCloudinaryFolder("banners"), "nzo/banners");
  assert.equal(buildCloudinaryFolder("brands"), "nzo/brands");
  assert.equal(buildCloudinaryFolder("content"), "nzo/content");
});

test("rejects SKU that could escape the root folder", () => {
  for (const sku of ["", "../other", "a/b", "..", " x", "a".repeat(65)]) {
    assert.throws(() => buildCloudinaryFolder("products", sku));
  }
  assert.throws(() => buildCloudinaryFolder("products"));
});

test("rejects SKU on non-product sections", () => {
  assert.throws(() => buildCloudinaryFolder("banners", "NZO-001"));
});

test("section guard and public_id guard", () => {
  assert.equal(isCloudinarySection("products"), true);
  assert.equal(isCloudinarySection("samples"), false);
  assert.equal(isNzoPublicId("nzo/products/NZO-001/front"), true);
  assert.equal(isNzoPublicId("samples/cat"), false);
  assert.equal(isNzoPublicId("nzo/../samples/cat"), false);
});
