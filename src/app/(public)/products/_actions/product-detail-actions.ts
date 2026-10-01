"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/legacy/server";
import type { Database } from "@/types/legacy-supabase";

export type ProductActionResult =
  { success: true; lineId: string } | { success: false; error: string };

async function getAvailableStock(supabase: SupabaseClient<Database>, variantId: string) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, stock, reserved, is_active")
    .eq("id", variantId)
    .maybeSingle();
  if (error || !data || data.is_active === false) return { ok: false as const, available: 0 };
  const available = Math.max(0, data.stock - (data.reserved ?? 0));
  return { ok: true as const, available };
}

export async function addVariantToCart(
  variantId: string,
  quantity: number,
): Promise<ProductActionResult> {
  try {
    const qty = Math.floor(quantity);
    if (!variantId || qty < 1) {
      return { success: false, error: "Jumlah atau varian tidak valid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Silakan masuk untuk menambahkan ke keranjang." };
    }

    const stock = await getAvailableStock(supabase, variantId);
    if (!stock.ok) {
      return { success: false, error: "Varian tidak tersedia." };
    }
    if (qty > stock.available) {
      return { success: false, error: "Stok tidak mencukupi." };
    }

    let { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!cart) {
      const { data: inserted, error: insErr } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (insErr || !inserted) {
        return { success: false, error: insErr?.message ?? "Gagal membuat keranjang." };
      }
      cart = inserted;
    }

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("variant_id", variantId)
      .maybeSingle();

    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > stock.available) {
        return { success: false, error: "Total di keranjang melebihi stok." };
      }
      const { error: upErr } = await supabase
        .from("cart_items")
        .update({ quantity: nextQty, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (upErr) return { success: false, error: upErr.message };
      revalidatePath("/cart");
      return { success: true, lineId: existing.id };
    } else {
      const { data: inserted, error: addErr } = await supabase
        .from("cart_items")
        .insert({ cart_id: cart.id, variant_id: variantId, quantity: qty })
        .select("id")
        .single();
      if (addErr || !inserted)
        return { success: false, error: addErr?.message ?? "Gagal menambahkan ke keranjang." };
      revalidatePath("/cart");
      return { success: true, lineId: inserted.id };
    }
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export type WishlistToggleResult =
  { success: true; inWishlist: boolean } | { success: false; error: string };

export async function toggleWishlistProduct(productId: string): Promise<WishlistToggleResult> {
  try {
    if (!productId) {
      return { success: false, error: "Produk tidak valid." };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Silakan masuk untuk wishlist." };
    }

    const { data: row } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (row) {
      const { error } = await supabase.from("wishlists").delete().eq("id", row.id);
      if (error) return { success: false, error: error.message };
      revalidatePath("/dashboard");
      return { success: true, inWishlist: false };
    }

    const { error } = await supabase
      .from("wishlists")
      .insert({ user_id: user.id, product_id: productId });
    if (error) {
      if (error.code === "23505") {
        return { success: true, inWishlist: true };
      }
      return { success: false, error: error.message };
    }
    revalidatePath("/dashboard");
    return { success: true, inWishlist: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan." };
  }
}
