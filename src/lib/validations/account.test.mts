import assert from "node:assert/strict";
import test from "node:test";

import { changePasswordSchema, profileSchema, returnSchema, reviewSchema } from "./account.ts";

const uid = "0b8a3a52-2f3c-4f50-8a8a-2d5c1b9e7f10";
const file = "6f1c1b7e-3c1a-4f0e-9a51-1a2b3c4d5e6f";

test("profile allows empty phone and normalizes digits", () => {
  assert.equal(profileSchema.parse({ fullName: "Budi", phone: "" }).phone, "");
  assert.equal(
    profileSchema.parse({ fullName: "Budi", phone: "0812 3456-7890" }).phone,
    "081234567890",
  );
  assert.equal(profileSchema.safeParse({ fullName: "B", phone: "" }).success, false);
});

test("password change requires matching, different, mixed password", () => {
  const ok = { currentPassword: "lama1234", newPassword: "baru5678", confirmPassword: "baru5678" };
  assert.equal(changePasswordSchema.safeParse(ok).success, true);
  assert.equal(changePasswordSchema.safeParse({ ...ok, confirmPassword: "x" }).success, false);
  assert.equal(
    changePasswordSchema.safeParse({ ...ok, newPassword: "lama1234", confirmPassword: "lama1234" })
      .success,
    false,
  );
  assert.equal(
    changePasswordSchema.safeParse({ ...ok, newPassword: "abcdefgh", confirmPassword: "abcdefgh" })
      .success,
    false,
  );
});

test("media paths must be server-shaped uid/uuid.ext", () => {
  const base = { orderItemId: uid, rating: 5, imagePaths: [`${uid}/${file}.jpg`] };
  assert.equal(reviewSchema.safeParse(base).success, true);
  assert.equal(reviewSchema.safeParse({ ...base, imagePaths: ["../etc/passwd"] }).success, false);
  assert.equal(reviewSchema.safeParse({ ...base, rating: 0 }).success, false);
});

test("return requires a known reason", () => {
  const base = {
    orderNumber: "NZO-261012-ABC123",
    orderItemId: null,
    reason: "Barang rusak saat diterima",
    mediaPaths: [],
  };
  assert.equal(returnSchema.safeParse(base).success, true);
  assert.equal(returnSchema.safeParse({ ...base, reason: "bebas" }).success, false);
});
