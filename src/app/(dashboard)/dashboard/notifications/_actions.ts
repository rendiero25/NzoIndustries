"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SimpleActionResult = { success: true } | { success: false; error: string };

export async function markNotificationReadAction(
  notificationId: string,
): Promise<SimpleActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(notificationId);
    if (!parsed.success) return { success: false, error: "Notifikasi tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", parsed.data)
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function markFirstLoginDoneAction(): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { error } = await supabase
      .from("profiles")
      .update({ first_login_done: true })
      .eq("id", user.id)
      .eq("first_login_done", false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function markAllNotificationsReadAction(): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
