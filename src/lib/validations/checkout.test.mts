import assert from "node:assert/strict";
import test from "node:test";

import { addressSchema } from "./address.ts";
import { placeOrderSchema, rateIdSchema, voucherCodeSchema } from "./checkout.ts";

const address = {
  recipient: "Budi Santoso",
  phone: "0812-3456 7890",
  areaId: "IDNP6IDNC148IDND836",
  province: "DKI Jakarta",
  city: "Jakarta Pusat",
  district: "Gambir",
  postalCode: "10110",
  fullAddress: "Jl. Merdeka No. 1, RT 01/RW 02",
};

test("address schema normalizes phone and enforces DB formats", () => {
  const parsed = addressSchema.parse(address);
  assert.equal(parsed.phone, "081234567890");
  assert.equal(addressSchema.safeParse({ ...address, postalCode: "1011" }).success, false);
  assert.equal(addressSchema.safeParse({ ...address, phone: "12ab" }).success, false);
  assert.equal(addressSchema.safeParse({ ...address, fullAddress: "pendek" }).success, false);
});

test("voucher code allows only safe characters", () => {
  assert.equal(voucherCodeSchema.safeParse("HEMAT_10").success, true);
  assert.equal(voucherCodeSchema.safeParse("x' or 1=1").success, false);
});

test("rate id must be courier:service", () => {
  assert.equal(rateIdSchema.safeParse("jne:reg").success, true);
  assert.equal(rateIdSchema.safeParse("jne").success, false);
});

test("place order requires address, rate, provider and checkout key", () => {
  const ok = placeOrderSchema.safeParse({
    checkoutKey: "6f1c1b7e-3c1a-4f0e-9a51-1a2b3c4d5e6f",
    addressId: "0b8a3a52-2f3c-4f50-8a8a-2d5c1b9e7f10",
    rateId: "uji:reg",
    paymentProvider: "manual_transfer",
  });
  assert.equal(ok.success, true);
  const bad = placeOrderSchema.safeParse({
    checkoutKey: "x",
    rateId: "uji:reg",
    paymentProvider: "cod",
  });
  assert.equal(bad.success, false);
});
