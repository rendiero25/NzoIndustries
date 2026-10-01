import { createServiceClient } from "@/lib/supabase/legacy/server";

type NotifInput = {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
};

const MAX_NOTIFICATIONS_PER_USER = 10;

export async function createNotification(input: NotifInput): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      data: (input.data ?? null) as import("@/types/legacy-supabase").Json,
    });

    // Delete old notifications beyond max limit
    const { data: oldIds } = await svc
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .range(MAX_NOTIFICATIONS_PER_USER, 9999);

    if (oldIds && oldIds.length > 0) {
      await svc
        .from("notifications")
        .delete()
        .in(
          "id",
          oldIds.map((r) => r.id),
        );
    }
  } catch {
    // Fire-and-forget — jangan sampai break flow utama
  }
}
