import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getClientEnv } from "@/lib/env.client";
import type { Database } from "@/types/database";

/**
 * Client anon tanpa cookie/sesi untuk data katalog publik (RLS anon berlaku).
 * Aman dipakai di dalam `unstable_cache` karena tidak bergantung pada user.
 * Jangan dipakai untuk data milik user; pakai `createClient()` (server.ts).
 */
let client: ReturnType<typeof createSupabaseClient<Database>> | undefined;

export function createPublicClient() {
  if (client) return client;
  const env = getClientEnv();
  client = createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  return client;
}
