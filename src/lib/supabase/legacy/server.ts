import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/legacy-supabase";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            // setAll dipanggil dari Server Component — cookies tidak bisa di-set,
            // tapi middleware sudah menangani refresh session.
          }
        },
      },
    },
  );
}

/**
 * Server client dengan service_role key.
 * Gunakan HANYA di API routes / server actions yang membutuhkan bypass RLS.
 * JANGAN gunakan di Client Components atau expose ke browser.
 *
 * Menggunakan createClient dari @supabase/supabase-js (bukan @supabase/ssr)
 * agar Authorization header benar-benar pakai service role JWT — bukan JWT
 * user dari cookies — sehingga RLS di-bypass sepenuhnya.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
