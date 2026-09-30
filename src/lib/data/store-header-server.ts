import { createClient, createServiceClient } from "@/lib/supabase/server";

export type StoreHeaderCategoryRow = { id: string; name: string; slug: string };

export async function fetchStoreHeaderCategories(): Promise<StoreHeaderCategoryRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

/** Promo produk second aktif terbaru — dipakai link "Second Hand" di nav header. */
export async function fetchStoreHeaderSecondHandPromoId(): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("promotions")
      .select("id")
      .eq("type", "second_products")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function fetchStoreHeaderCartCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!cart) return 0;

    const { data: items } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("cart_id", cart.id);
    if (!items) return 0;

    return items.reduce((sum, item) => sum + item.quantity, 0);
  } catch {
    return 0;
  }
}
