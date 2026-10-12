import assert from "node:assert/strict";
import test from "node:test";

import { orderStatusMeta, orderTab, withinReturnWindow } from "./status.ts";

test("maps order statuses to Indonesian labels", () => {
  assert.equal(orderStatusMeta("pending_payment").label, "Belum bayar");
  assert.equal(orderStatusMeta("completed").tone, "success");
  assert.equal(orderStatusMeta("unknown").label, "unknown");
});

test("resolves order tabs with fallback to all", () => {
  assert.deepEqual(orderTab("shipped").statuses, ["shipped", "delivered"]);
  assert.equal(orderTab("nope").key, "all");
  assert.equal(orderTab(undefined).statuses, null);
});

test("return window counts days since receipt", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  assert.equal(withinReturnWindow(new Date("2026-10-06T00:00:00Z"), 7, now), true);
  assert.equal(withinReturnWindow(new Date("2026-10-04T00:00:00Z"), 7, now), false);
  assert.equal(withinReturnWindow(new Date("2026-10-11T00:00:00Z"), 0, now), false);
});
