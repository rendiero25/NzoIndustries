"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type WishlistResult =
  { ok: true; saved: boolean } | { ok: false; error: string; needsLogin?: boolean };

const schema = z.object({ productId: z.uuid() });

/** Simpan/lepas produk dari wishlist (wajib login; RLS: milik sendiri & produk published). */
export async function toggleWishlist(input: z.infer<typeof schema>): Promise<WishlistResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Produk tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu untuk menyimpan wishlist.", needsLogin: true };
  if (user.isBlocked) return { ok: false, error: "Akun kamu diblokir." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", parsed.data.productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("wishlists").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "Gagal menghapus dari wishlist." };
    revalidatePath("/wishlist");
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, product_id: parsed.data.productId });
  if (error) return { ok: false, error: "Gagal menyimpan ke wishlist." };
  revalidatePath("/wishlist");
  return { ok: true, saved: true };
}

/** Id produk di wishlist user (untuk status ikon hati). Kosong untuk guest. */
export async function getWishlistIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", user.id)
    .limit(500);
  return (data ?? []).map((w) => w.product_id);
}
