import { createServiceClient } from "@/lib/supabase/server";

type AdminNotifInput = {
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
};

export async function createAdminNotification(input: AdminNotifInput): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from("admin_notifications").insert({
      title: input.title,
      body: input.body,
      type: input.type,
      data: (input.data ?? null) as import("@/types/supabase").Json,
    });
  } catch {
    // Fire-and-forget — jangan break flow utama
  }
}
