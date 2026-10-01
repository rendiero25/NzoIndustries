import assert from "node:assert/strict";
import test from "node:test";

import { safeRedirectPath } from "./redirect.ts";

test("keeps internal paths with query and hash", () => {
  assert.equal(safeRedirectPath("/dashboard/orders?page=2#top"), "/dashboard/orders?page=2#top");
});

test("rejects external and protocol-relative targets", () => {
  for (const bad of [
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "/%0d%0aSet-Cookie:x",
    "/\nfoo",
    "",
  ]) {
    const result = safeRedirectPath(bad, "/");
    assert.ok(result === "/" || result.startsWith("/%0d"), `unexpected: ${bad} -> ${result}`);
    assert.ok(!result.startsWith("//"));
  }
});

test("uses fallback for null", () => {
  assert.equal(safeRedirectPath(null, "/dashboard"), "/dashboard");
});
