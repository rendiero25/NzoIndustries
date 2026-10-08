import "server-only";

import { createPublicClient } from "@/lib/supabase/public";
import type { createClient } from "@/lib/supabase/server";
import type { CartLineInput } from "@/lib/validations/checkout";

/**
 * Baris keranjang dengan harga & stok tersedia terkini dari RPC `cart_lines`
 * (harga flash sale, reservasi aktif dikurangi). Satu-satunya sumber harga
 * yang ditampilkan di keranjang/checkout.
 */
export type CartLineStatus = "ok" | "insufficient" | "unavailable";

export type CartLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  slug: string | null;
  name: string | null;
  variantName: string | null;
  sku: string | null;
  imagePublicId: string | null;
  unitPrice: number;
  regularPrice: number;
  compareAtPrice: number | null;
  isFlashSale: boolean;
  available: number;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  status: CartLineStatus;
};

export type CartLineRow = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  slug: string | null;
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
  image_public_id: string | null;
  unit_price: number | null;
  regular_price: number | null;
  compare_at_price: number | null;
  flash_sale_item_id: string | null;
  available: number;
  weight_grams: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  status: string;
};

export function toCartLine(r: CartLineRow): CartLine {
  const status: CartLineStatus =
    r.status === "ok" || r.status === "insufficient" ? r.status : "unavailable";
  return {
    productId: r.product_id,
    variantId: r.variant_id,
    quantity: r.quantity,
    slug: r.slug,
    name: r.product_name,
    variantName: r.variant_name,
    sku: r.sku,
    imagePublicId: r.image_public_id,
    unitPrice: Number(r.unit_price ?? 0),
    regularPrice: Number(r.regular_price ?? 0),
    compareAtPrice: r.compare_at_price === null ? null : Number(r.compare_at_price),
    isFlashSale: r.flash_sale_item_id !== null,
    available: r.available,
    weightGrams: r.weight_grams,
    lengthMm: r.length_mm,
    widthMm: r.width_mm,
    heightMm: r.height_mm,
    status,
  };
}

export function toRpcItems(items: CartLineInput[]) {
  return items.map((i) => ({
    product_id: i.productId,
    variant_id: i.variantId,
    quantity: i.quantity,
  }));
}

export async function priceCartLines(items: CartLineInput[]): Promise<CartLine[]> {
  if (items.length === 0) return [];
  const { data, error } = await createPublicClient().rpc("cart_lines", {
    p_items: toRpcItems(items),
  });
  if (error) throw new Error(`cart_lines: ${error.message}`);
  return (data ?? []).map(toCartLine);
}

type UserClient = Awaited<ReturnType<typeof createClient>>;

/** Isi tabel `cart_items` milik user (RLS: hanya milik sendiri). */
export async function readUserCart(
  supabase: UserClient,
  userId: string,
): Promise<{ cartId: string | null; items: CartLineInput[] }> {
  const { data: cart } = await supabase
    .from("carts")
    .select("id, cart_items(product_id, variant_id, quantity, created_at)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!cart) return { cartId: null, items: [] };
  const items = [...(cart.cart_items ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((i) => ({ productId: i.product_id, variantId: i.variant_id, quantity: i.quantity }));
  return { cartId: cart.id, items };
}
