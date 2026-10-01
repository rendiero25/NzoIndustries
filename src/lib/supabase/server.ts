import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getClientEnv } from "@/lib/env.client";
import type { Database } from "@/types/database";

/**
 * Client user-scoped (cookie session). RLS berlaku penuh dan `auth.uid()`
 * terisi, sehingga audit log mencatat pelaku. Pakai ini untuk semua aksi
 * admin/user. Service role hanya lewat `createAdminClient()` (admin.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getClientEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component: cookie tidak bisa ditulis.
            // Refresh session ditangani proxy.
          }
        },
      },
    },
  );
}
