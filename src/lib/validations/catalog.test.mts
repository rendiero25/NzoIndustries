import assert from "node:assert/strict";
import test from "node:test";

import { modelYears, parseVehicleCookie, serializeVehicleCookie } from "../vehicle-cookie.ts";
import { countActiveFilters, parseCatalogParams, serializeCatalogParams } from "./catalog.ts";

test("parseCatalogParams sanitizes and defaults", () => {
  const p = parseCatalogParams({
    q: "  kampas   rem ",
    b: "npp,Yamaha-YGP,../x,npp",
    min: "50000",
    max: "10000",
    stock: "1",
    rating: "9",
    sort: "drop table",
    page: "0",
  });
  assert.equal(p.q, "kampas rem");
  assert.deepEqual(p.brands, ["npp", "yamaha-ygp"]);
  assert.deepEqual(parseCatalogParams({ b: "yss,npp" }).brands, ["npp", "yss"]);
  assert.equal(p.min, 10000);
  assert.equal(p.max, 50000);
  assert.equal(p.inStock, true);
  assert.equal(p.rating, null);
  assert.equal(p.sort, "relevance");
  assert.equal(p.page, 1);

  const empty = parseCatalogParams({});
  assert.equal(empty.sort, "bestseller");
  assert.equal(empty.q, null);
  assert.equal(countActiveFilters(empty), 0);
});

test("serializeCatalogParams is canonical and round-trips", () => {
  const p = parseCatalogParams({
    b: "yss,npp",
    min: "1000",
    fit: "1",
    sort: "price_asc",
    page: "3",
  });
  const qs = serializeCatalogParams(p);
  assert.equal(qs, "?b=npp%2Cyss&min=1000&fit=1&sort=price_asc&page=3");
  assert.deepEqual(parseCatalogParams(Object.fromEntries(new URLSearchParams(qs))), p);
  assert.equal(serializeCatalogParams(parseCatalogParams({})), "");
  assert.equal(countActiveFilters(p), 3);
});

test("vehicle cookie parse/serialize", () => {
  const v = { modelId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", year: 2022 };
  assert.deepEqual(parseVehicleCookie(serializeVehicleCookie(v)), v);
  assert.equal(parseVehicleCookie("x:2022"), null);
  assert.equal(parseVehicleCookie(`${v.modelId}:1800`), null);
  assert.equal(parseVehicleCookie(undefined), null);
});

test("modelYears lists newest first and caps the future", () => {
  const now = new Date("2026-10-07");
  assert.deepEqual(modelYears(2022, null, now), [2027, 2026, 2025, 2024, 2023, 2022]);
  assert.deepEqual(modelYears(2015, 2017, now), [2017, 2016, 2015]);
});
