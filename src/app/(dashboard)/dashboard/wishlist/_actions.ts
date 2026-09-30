"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SimpleActionResult = { success: true } | { success: false; error: string };

export async function removeWishlistItemAction(wishlistId: string): Promise<SimpleActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(wishlistId);
    if (!parsed.success) return { success: false, error: "Item tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", parsed.data)
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/wishlist");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
