import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMayarPaymentMethod, paymentMethodLabel } from "./mayar-method.ts";

test("normalizes Mayar payment methods", () => {
  assert.equal(normalizeMayarPaymentMethod("QRIS"), "qris");
  assert.equal(normalizeMayarPaymentMethod("va/bni"), "bni_va");
  assert.equal(normalizeMayarPaymentMethod("ewallet/gopay"), "gopay");
  assert.equal(normalizeMayarPaymentMethod("Credit Card"), "credit_card");
  assert.equal(normalizeMayarPaymentMethod(""), null);
  assert.equal(normalizeMayarPaymentMethod(null), null);
});

test("labels payment methods for display", () => {
  assert.equal(paymentMethodLabel("bca_va"), "Virtual Account BCA");
  assert.equal(paymentMethodLabel("qris"), "QRIS");
  assert.equal(paymentMethodLabel(null), null);
});
