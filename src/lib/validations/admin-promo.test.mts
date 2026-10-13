import assert from "node:assert/strict";
import test from "node:test";

import {
  bannerSchema,
  contentPageSchema,
  flashSaleSchema,
  toWibInput,
  voucherSchema,
  wibDateTime,
} from "./admin-promo.ts";

test("waktu WIB: input lokal dan ISO hasil resolver sama-sama diterima", () => {
  const local = wibDateTime.parse("2026-10-13T00:00");
  assert.equal(local, "2026-10-12T17:00:00.000Z");
  // Nilai yang sudah ditransformasi di client dikirim ulang ke server action.
  assert.equal(wibDateTime.parse(local), local);
  assert.equal(wibDateTime.parse(""), null);
  assert.equal(toWibInput(local), "2026-10-13T00:00");
  assert.equal(wibDateTime.safeParse("13/10/2026").success, false);
});

test("flash sale: parse dua kali (client lalu server) tetap valid", () => {
  const input = {
    name: "Promo",
    subtitle: "",
    startsAt: "2026-10-13T00:00",
    endsAt: "2026-10-15T23:00",
    isActive: true,
  };
  const once = flashSaleSchema.parse(input);
  const twice = flashSaleSchema.parse(once);
  assert.deepEqual(twice, once);
  assert.equal(flashSaleSchema.safeParse({ ...input, endsAt: "2026-10-12T00:00" }).success, false);
});

test("voucher: persen maks 100, kode jadi huruf besar, parse ulang aman", () => {
  const base = {
    code: "hemat10",
    discountType: "percent",
    discountValue: 10,
    maxDiscount: "",
    minSubtotal: 0,
    usageLimit: "",
    perUserLimit: 1,
    startsAt: "",
    endsAt: "",
    isActive: true,
    isPublic: true,
  } as const;
  const v = voucherSchema.parse(base);
  assert.equal(v.code, "HEMAT10");
  assert.equal(v.maxDiscount, null);
  assert.deepEqual(voucherSchema.parse(v), v);
  assert.equal(voucherSchema.safeParse({ ...base, discountValue: 120 }).success, false);
  assert.equal(voucherSchema.safeParse({ ...base, code: "a b" }).success, false);
});

test("banner: gambar wajib kecuali bar promo, link aman", () => {
  const bar = {
    placement: "promo_bar",
    title: "Gratis ongkir",
    subtitle: "",
    imagePublicId: "",
    mobileImagePublicId: "",
    linkUrl: "/promo",
    startsAt: "",
    endsAt: "",
    isActive: true,
  } as const;
  assert.equal(bannerSchema.safeParse(bar).success, true);
  assert.equal(bannerSchema.safeParse({ ...bar, title: "" }).success, false);
  assert.equal(bannerSchema.safeParse({ ...bar, placement: "hero" }).success, false);
  assert.equal(
    bannerSchema.safeParse({ ...bar, placement: "hero", imagePublicId: "nzo/banners/a" }).success,
    true,
  );
  assert.equal(
    bannerSchema.safeParse({ ...bar, placement: "hero", imagePublicId: "other/a" }).success,
    false,
  );
  for (const bad of ["//evil.example", "javascript:alert(1)", "http://x.test"]) {
    assert.equal(bannerSchema.safeParse({ ...bar, linkUrl: bad }).success, false, bad);
  }
});

test("halaman statis: tidak boleh tayang dengan isi kosong", () => {
  const page = { title: "FAQ", body: "  ", metaDescription: "", isPublished: true };
  assert.equal(contentPageSchema.safeParse(page).success, false);
  assert.equal(contentPageSchema.safeParse({ ...page, isPublished: false }).success, true);
});
