import assert from "node:assert/strict";
import test from "node:test";

import { isChunkLoadFailure } from "./chunk-load-recovery.ts";

test("detects the Next.js chunk loading error reported by the checkout route", () => {
  assert.equal(
    isChunkLoadFailure(
      new Error(
        "Loading chunk 6676 failed. (error: /_next/static/chunks/app/(public)/checkout/page-old.js)",
      ),
    ),
    true,
  );
});

test("does not reload for unrelated browser errors", () => {
  assert.equal(isChunkLoadFailure(new Error("Failed to fetch")), false);
});
