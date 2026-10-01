"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/legacy/server";

export type CartActionResult = { success: true } | { success: false; error: string };

type CartItemWithCart = {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  carts: { user_id: string } | { user_id: string }[] | null;
};

function cartUserId(row: CartItemWithCart): string | null {
  const c = row.carts;
  if (!c) return null;
  return Array.isArray(c) ? (c[0]?.user_id ?? null) : c.user_id;
}

async function getAvailableStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantId: string,
): Promise<{ ok: true; available: number } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, stock, reserved, is_active")
    .eq("id", variantId)
    .maybeSingle();
  if (error || !data || data.is_active === false) {
    return { ok: false, error: "Varian tidak tersedia." };
  }
  const available = Math.max(0, data.stock - (data.reserved ?? 0));
  return { ok: true, available };
}

async function loadOwnedLine(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  lineId: string,
): Promise<{ ok: true; line: CartItemWithCart } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("id, cart_id, variant_id, quantity, carts!inner(user_id)")
    .eq("id", lineId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: "Item tidak ditemukan." };
  }
  const row = data as unknown as CartItemWithCart;
  if (cartUserId(row) !== userId) {
    return { ok: false, error: "Tidak diizinkan." };
  }
  return { ok: true, line: row };
}

export async function updateCartItemQuantityAction(
  lineId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const idParse = z.string().uuid().safeParse(lineId);
    if (!idParse.success) return { success: false, error: "Item tidak valid." };

    const qty = Math.floor(Number(quantity));
    if (qty < 1) return { success: false, error: "Jumlah minimal 1." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk." };

    const owned = await loadOwnedLine(supabase, user.id, idParse.data);
    if (!owned.ok) return { success: false, error: owned.error };

    const stock = await getAvailableStock(supabase, owned.line.variant_id);
    if (!stock.ok) return { success: false, error: stock.error };
    if (qty > stock.available) {
      return { success: false, error: "Stok tidak mencukupi." };
    }

    const { error: upErr } = await supabase
      .from("cart_items")
      .update({ quantity: qty, updated_at: new Date().toISOString() })
      .eq("id", owned.line.id);
    if (upErr) return { success: false, error: upErr.message };

    revalidatePath("/cart");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function removeCartItemAction(lineId: string): Promise<CartActionResult> {
  try {
    const idParse = z.string().uuid().safeParse(lineId);
    if (!idParse.success) return { success: false, error: "Item tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk." };

    const owned = await loadOwnedLine(supabase, user.id, idParse.data);
    if (!owned.ok) return { success: false, error: owned.error };

    const { error: delErr } = await supabase.from("cart_items").delete().eq("id", owned.line.id);
    if (delErr) return { success: false, error: delErr.message };

    revalidatePath("/cart");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
