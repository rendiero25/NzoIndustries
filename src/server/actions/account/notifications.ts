"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** Tandai satu notifikasi (atau semua bila `id` kosong) sudah dibaca. */
export async function markNotificationsRead(input: { id?: string }): Promise<Result> {
  const parsed = z.object({ id: z.uuid().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Notifikasi tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (parsed.data.id) query = query.eq("id", parsed.data.id);
  const { error } = await query;
  if (error) return { ok: false, error: "Gagal memperbarui notifikasi." };
  revalidatePath("/account", "layout");
  return { ok: true };
}

/** Jumlah notifikasi belum dibaca (lonceng header). 0 untuk guest. */
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}
