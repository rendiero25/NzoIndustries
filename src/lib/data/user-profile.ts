import "server-only";

import { createClient } from "@/lib/supabase/legacy/server";

import type { Database } from "@/types/legacy-supabase";

/**
 * Profil untuk auth store legacy (header & admin lama, D-19) sampai auth store
 * pindah ke tipe NZO. Dipindah dari `dashboard-user.ts` saat `/dashboard` dihapus (Fase 7).
 */
export async function fetchUserProfile(
  userId: string,
): Promise<Database["public"]["Tables"]["profiles"]["Row"] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
