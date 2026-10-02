import type { createBrowserClient } from "@supabase/ssr";

import { createClient as createNzoClient } from "@/lib/supabase/client";
import type { Database } from "@/types/legacy-supabase";

/**
 * Shim legacy (D-19): memakai instance browser client yang SAMA dengan client
 * NZO, hanya beda tipe. Dua instance GoTrueClient dengan storage key sama bisa
 * saling berebut lock auth. Hapus file ini saat kode starter selesai ditulis ulang.
 */
export function createClient() {
  return createNzoClient() as unknown as ReturnType<typeof createBrowserClient<Database>>;
}
