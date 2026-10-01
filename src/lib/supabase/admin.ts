import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getClientEnv } from "@/lib/env.client";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client service role: MELEWATI RLS dan tidak punya `auth.uid()`.
 * Hanya untuk webhook, cron, script, dan operasi sistem (mis. membuat pesanan
 * setelah total dihitung ulang). Jangan dipakai untuk aksi admin dari UI —
 * gunakan `createClient()` dari server.ts agar RLS + audit berlaku.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getClientEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
