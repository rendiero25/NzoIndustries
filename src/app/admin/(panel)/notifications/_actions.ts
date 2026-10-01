"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/legacy/server";

export type SimpleActionResult = { success: true } | { success: false; error: string };

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return { supabase, user };
}

export async function markAdminNotificationReadAction(
  notificationId: string,
): Promise<SimpleActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(notificationId);
    if (!parsed.success) return { success: false, error: "Notifikasi tidak valid." };

    const ctx = await getAdminUser();
    if (!ctx) return { success: false, error: "Akses ditolak." };

    const { error } = await ctx.supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", parsed.data);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function markAllAdminNotificationsReadAction(): Promise<SimpleActionResult> {
  try {
    const ctx = await getAdminUser();
    if (!ctx) return { success: false, error: "Akses ditolak." };

    const { error } = await ctx.supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/notifications");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
