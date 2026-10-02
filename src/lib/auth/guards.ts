import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import {
  decideAccess,
  isAppRole,
  STAFF_ROLES,
  type AccessDecision,
  type Aal,
  type AppRole,
} from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string | null;
  isBlocked: boolean;
  aal: Aal;
};

/**
 * User + profil untuk request ini (di-cache per request).
 * `getUser()` memverifikasi token ke Supabase Auth, bukan hanya membaca cookie.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: aalData }] = await Promise.all([
    supabase.from("profiles").select("role, full_name, is_blocked").eq("id", user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (!profile || !isAppRole(profile.role)) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role,
    fullName: profile.full_name,
    isBlocked: profile.is_blocked,
    aal: aalData?.currentLevel === "aal2" ? "aal2" : "aal1",
  };
});

/**
 * Kebijakan MFA staf dari database (`store_settings.require_staff_mfa`, D-20).
 * Sumber yang sama dipakai RLS, jadi aplikasi dan database selalu sejalan.
 * Gagal membaca = anggap wajib (fail closed).
 */
export const getStaffMfaRequired = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_mfa_required");
  return error ? true : data === true;
});

/** Keputusan akses tanpa redirect — untuk server action yang mengembalikan error. */
export async function checkRole(
  roles: readonly AppRole[],
  options: { requireMfa?: boolean } = {},
): Promise<{ user: CurrentUser | null; decision: AccessDecision }> {
  const [user, mfaRequired] = await Promise.all([getCurrentUser(), getStaffMfaRequired()]);
  const decision = decideAccess(
    {
      authenticated: !!user,
      role: user?.role ?? null,
      isBlocked: user?.isBlocked ?? false,
      aal: user?.aal ?? null,
    },
    roles,
    { requireMfa: options.requireMfa ?? mfaRequired },
  );
  return { user, decision };
}

/** Area pelanggan (dan staf yang juga belanja). */
export async function requireUser(redirectTo = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  if (user.isBlocked) redirect("/login?error=blocked");
  return user;
}

/**
 * Halaman dengan role tertentu. Bila MFA staf diwajibkan (D-20), staf aal1
 * diarahkan ke /admin/mfa.
 * Role salah: 404 (tidak membocorkan keberadaan halaman).
 */
export async function requireRole(
  roles: readonly AppRole[],
  options: { requireMfa?: boolean } = {},
): Promise<CurrentUser> {
  const { user, decision } = await checkRole(roles, options);
  if (decision.ok && user) return user;

  switch (decision.ok ? "forbidden" : decision.reason) {
    case "unauthenticated":
      redirect("/admin/login");
    case "blocked":
      redirect("/admin/login?error=blocked");
    case "mfa_required":
      redirect("/admin/mfa");
    default:
      notFound();
  }
}

export function requireStaff(options: { requireMfa?: boolean } = {}): Promise<CurrentUser> {
  return requireRole(STAFF_ROLES, options);
}
