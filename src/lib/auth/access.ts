/**
 * Logika keputusan akses murni (tanpa I/O) supaya bisa diuji unit.
 * Dipakai guards.ts (server) dan proxy (redirect UX).
 * Sumber kebenaran tetap RLS di database (has_role butuh aal2 untuk staf).
 */
export const APP_ROLES = ["owner", "admin", "warehouse", "cs", "customer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES = [
  "owner",
  "admin",
  "warehouse",
  "cs",
] as const satisfies readonly AppRole[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export type Aal = "aal1" | "aal2";

export type AccessInput = {
  authenticated: boolean;
  role: AppRole | null;
  isBlocked: boolean;
  aal: Aal | null;
};

export type AccessDenyReason = "unauthenticated" | "blocked" | "forbidden" | "mfa_required";

export type AccessDecision = { ok: true } | { ok: false; reason: AccessDenyReason };

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: AppRole | null | undefined): role is StaffRole {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Staf selalu wajib MFA (aal2) kecuali `requireMfa: false` dipakai eksplisit
 * (mis. halaman /admin/mfa itu sendiri).
 */
export function decideAccess(
  input: AccessInput,
  allowed: readonly AppRole[],
  options: { requireMfa?: boolean } = {},
): AccessDecision {
  if (!input.authenticated) return { ok: false, reason: "unauthenticated" };
  if (input.isBlocked) return { ok: false, reason: "blocked" };
  if (!input.role || !allowed.includes(input.role)) return { ok: false, reason: "forbidden" };

  const requireMfa = options.requireMfa ?? true;
  if (requireMfa && isStaffRole(input.role) && input.aal !== "aal2") {
    return { ok: false, reason: "mfa_required" };
  }
  return { ok: true };
}
