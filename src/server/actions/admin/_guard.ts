import "server-only";

import { checkRole, type CurrentUser } from "@/lib/auth/guards";
import type { AppRole } from "@/lib/auth/access";

/** Role per kelompok fitur admin (selaras `ADMIN_NAV` & RLS). */
export const ROLES = {
  managers: ["owner", "admin"],
  orders: ["owner", "admin", "warehouse"],
  stock: ["owner", "admin", "warehouse"],
  service: ["owner", "admin", "cs"],
  staff: ["owner", "admin", "warehouse", "cs"],
  owner: ["owner"],
} as const satisfies Record<string, readonly AppRole[]>;

export type GuardResult = { ok: true; user: CurrentUser } | { ok: false; error: string };

/**
 * Guard server action admin: tidak redirect, mengembalikan pesan error.
 * RLS & cek role di RPC tetap jadi lapisan kedua.
 */
export async function adminGuard(roles: readonly AppRole[]): Promise<GuardResult> {
  const { user, decision } = await checkRole(roles);
  if (decision.ok && user) return { ok: true, user };
  const reason = decision.ok ? "forbidden" : decision.reason;
  return {
    ok: false,
    error:
      reason === "unauthenticated"
        ? "Sesi berakhir. Masuk lagi."
        : reason === "mfa_required"
          ? "Verifikasi MFA dulu."
          : "Kamu tidak punya akses untuk aksi ini.",
  };
}

/** Pesan error RPC: tampilkan pesan bisnis (P0001), sembunyikan detail teknis. */
export function rpcMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
): string {
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "42501") return "Kamu tidak punya akses untuk aksi ini.";
  return fallback;
}
