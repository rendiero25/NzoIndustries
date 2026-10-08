import assert from "node:assert/strict";
import test from "node:test";

import { parseMayarWebhook } from "./mayar-webhook.ts";

test("extracts refs, event id and order number", () => {
  const parsed = parseMayarWebhook({
    event: "payment.received",
    data: {
      id: "abc-123",
      transactionId: "tx_9",
      extraData: JSON.stringify({ orderNumber: "NZO-261009-A1B2C3" }),
      customerEmail: "x@example.com",
    },
  });
  assert.ok(parsed);
  assert.equal(parsed.eventId, "payment.received:abc-123");
  assert.deepEqual(parsed.refs, ["abc-123", "tx_9"]);
  assert.equal(parsed.orderNumber, "NZO-261009-A1B2C3");
});

test("rejects malformed payloads and unsafe ids", () => {
  assert.equal(parseMayarWebhook({ data: {} }), null);
  const parsed = parseMayarWebhook({
    event: "payment.received",
    data: { id: "1,2) or (1=1", extraData: { orderNumber: "../../etc" } },
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.refs, []);
  assert.equal(parsed.eventId, null);
  assert.equal(parsed.orderNumber, null);
});
