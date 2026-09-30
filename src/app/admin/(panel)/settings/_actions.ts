"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function saveSetting(key: string, value: unknown): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value: value as Json }, { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return {};
}
