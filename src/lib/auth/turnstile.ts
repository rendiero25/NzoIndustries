import "server-only";

import { getServerEnv } from "@/lib/env";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";

/**
 * Verifikasi token Cloudflare Turnstile di server.
 * Bila site key belum dikonfigurasi (dev), verifikasi dilewati.
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  if (!isTurnstileRequired()) return true;
  const secret = getServerEnv().TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
