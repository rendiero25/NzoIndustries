import assert from "node:assert/strict";
import test from "node:test";

import { checkUploadParams, signCloudinaryParams } from "./signature.ts";

test("signCloudinaryParams matches the Cloudinary documentation example", () => {
  const signature = signCloudinaryParams(
    {
      timestamp: 1315060510,
      public_id: "sample_image",
      eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
    },
    "abcd",
  );
  assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

const NOW = 1_800_000_000_000;
const ts = Math.floor(NOW / 1000);

test("checkUploadParams accepts the server-built folder only", () => {
  const ok = checkUploadParams(
    { timestamp: ts, folder: "nzo/products/ABC-1", source: "uw" },
    { section: "products", sku: "ABC-1" },
    NOW,
  );
  assert.equal(ok.ok, true);

  const wrongFolder = checkUploadParams(
    { timestamp: ts, folder: "other/products/ABC-1" },
    { section: "products", sku: "ABC-1" },
    NOW,
  );
  assert.deepEqual(wrongFolder, { ok: false, error: "Folder harus sesuai SKU/section" });

  const otherSku = checkUploadParams(
    { timestamp: ts, folder: "nzo/products/XYZ" },
    { section: "products", sku: "ABC-1" },
    NOW,
  );
  assert.equal(otherSku.ok, false);

  const badSku = checkUploadParams(
    { timestamp: ts, folder: "nzo/products/../x" },
    { section: "products", sku: "../x" },
    NOW,
  );
  assert.equal(badSku.ok, false);
});

test("checkUploadParams rejects extra params and stale timestamps", () => {
  const extra = checkUploadParams(
    { timestamp: ts, folder: "nzo/banners", overwrite: "true" },
    { section: "banners" },
    NOW,
  );
  assert.deepEqual(extra, { ok: false, error: "Parameter overwrite tidak diizinkan" });

  const stale = checkUploadParams(
    { timestamp: ts - 7200, folder: "nzo/banners" },
    { section: "banners" },
    NOW,
  );
  assert.deepEqual(stale, { ok: false, error: "Timestamp tidak valid" });

  const badPid = checkUploadParams(
    { timestamp: ts, folder: "nzo/banners", public_id: "../../x" },
    { section: "banners" },
    NOW,
  );
  assert.equal(badPid.ok, false);
});
