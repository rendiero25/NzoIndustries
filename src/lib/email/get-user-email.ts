import { createServiceClient } from "@/lib/supabase/legacy/server";

export async function getUserEmail(
  userId: string,
): Promise<{ email: string; name: string } | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc.auth.admin.getUserById(userId);
    if (!data.user?.email) return null;
    const name =
      data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email;
    return { email: data.user.email, name };
  } catch {
    return null;
  }
}
