import assert from "node:assert/strict";
import test from "node:test";

import { decideAccess, isStaffRole, STAFF_ROLES, type AccessInput } from "./access.ts";

const base: AccessInput = { authenticated: true, role: "customer", isBlocked: false, aal: "aal1" };

test("anonymous is unauthenticated", () => {
  assert.deepEqual(decideAccess({ ...base, authenticated: false, role: null }, ["customer"]), {
    ok: false,
    reason: "unauthenticated",
  });
});

test("blocked user is denied before role check", () => {
  assert.deepEqual(decideAccess({ ...base, isBlocked: true }, ["customer"]), {
    ok: false,
    reason: "blocked",
  });
});

test("customer allowed on customer area without MFA", () => {
  assert.deepEqual(decideAccess(base, ["customer"]), { ok: true });
});

test("customer cannot enter staff area", () => {
  assert.deepEqual(decideAccess(base, STAFF_ROLES), { ok: false, reason: "forbidden" });
});

test("staff with aal1 must complete MFA", () => {
  for (const role of STAFF_ROLES) {
    assert.deepEqual(decideAccess({ ...base, role }, STAFF_ROLES), {
      ok: false,
      reason: "mfa_required",
    });
  }
});

test("staff with aal2 allowed only for listed roles", () => {
  assert.deepEqual(decideAccess({ ...base, role: "admin", aal: "aal2" }, ["owner", "admin"]), {
    ok: true,
  });
  assert.deepEqual(decideAccess({ ...base, role: "cs", aal: "aal2" }, ["owner", "admin"]), {
    ok: false,
    reason: "forbidden",
  });
});

test("MFA page can opt out of aal2 requirement", () => {
  assert.deepEqual(
    decideAccess({ ...base, role: "warehouse" }, STAFF_ROLES, { requireMfa: false }),
    {
      ok: true,
    },
  );
});

test("null role is forbidden", () => {
  assert.deepEqual(decideAccess({ ...base, role: null }, ["customer"]), {
    ok: false,
    reason: "forbidden",
  });
  assert.equal(isStaffRole(null), false);
  assert.equal(isStaffRole("customer"), false);
  assert.equal(isStaffRole("owner"), true);
});
