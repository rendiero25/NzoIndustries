"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { effectivePrice } from "@/lib/money";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import {
  cartLineInputSchema,
  cartLinesInputSchema,
  type CartLineInput,
} from "@/lib/validations/checkout";
import { priceCartLines, readUserCart, type CartLine } from "@/server/queries/cart";

/**
 * Validasi sebelum menambah ke keranjang (guest/user). Mengembalikan snapshot
 * dari database (nama, harga, stok) untuk tampilan keranjang. Harga final
 * tetap dihitung ulang di server saat checkout (security rule 4, Fase 5).
 */
export type CartSnapshot = {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName: string | null;
  price: number;
  imagePublicId: string | null;
  stock: number;
};

export type CartAddResult = { ok: true; item: CartSnapshot } | { ok: false; error: string };

const schema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(999),
});

export async function validateCartAdd(input: z.infer<typeof schema>): Promise<CartAddResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data produk tidak valid." };
  const { productId, variantId, quantity } = parsed.data;

  const { data: product } = await createPublicClient()
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, stock, status, images:product_images(public_id, sort_order, variant_id), variants:product_variants(id, name, price, compare_at_price, stock, is_active, image_public_id)",
    )
    .eq("id", productId)
    .eq("status", "published")
    .maybeSingle();
  if (!product) return { ok: false, error: "Produk tidak tersedia." };

  const activeVariants = (product.variants ?? []).filter((v) => v.is_active);
  if (activeVariants.length && !variantId) return { ok: false, error: "Pilih varian dulu." };
  const variant = variantId ? activeVariants.find((v) => v.id === variantId) : null;
  if (variantId && !variant) return { ok: false, error: "Varian tidak tersedia." };

  const stock = variant ? variant.stock : product.stock;
  if (stock <= 0) return { ok: false, error: "Stok habis." };
  if (quantity > stock)
    return { ok: false, error: `Stok tersisa ${stock}. Kurangi jumlah pesanan.` };

  const { price } = effectivePrice(
    {
      price: Number(product.price),
      compare_at_price: product.compare_at_price === null ? null : Number(product.compare_at_price),
    },
    variant
      ? {
          price: variant.price === null ? null : Number(variant.price),
          compare_at_price:
            variant.compare_at_price === null ? null : Number(variant.compare_at_price),
        }
      : null,
  );
  const images = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const image =
    variant?.image_public_id ??
    images.find((i) => variant && i.variant_id === variant.id)?.public_id ??
    images[0]?.public_id ??
    null;

  return {
    ok: true,
    item: {
      productId: product.id,
      variantId: variant?.id ?? null,
      slug: product.slug,
      name: product.name,
      variantName: variant?.name ?? null,
      price,
      imagePublicId: image,
      stock,
    },
  };
}

// ------------------------------------------------------------
// Fase 5: harga/stok real-time & sinkron tabel `carts` (D-28)
// ------------------------------------------------------------

export type CartLinesResult = { ok: true; lines: CartLine[] } | { ok: false; error: string };

/** Harga & stok tersedia terkini untuk isi keranjang (guest atau login). */
export async function getCartLines(items: CartLineInput[]): Promise<CartLinesResult> {
  const parsed = cartLinesInputSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Data keranjang tidak valid." };
  try {
    return { ok: true, lines: await priceCartLines(parsed.data) };
  } catch {
    return { ok: false, error: "Keranjang gagal dimuat. Coba lagi." };
  }
}

export type CartSyncResult =
  | { ok: true; lines: CartLine[]; removed: number }
  | { ok: false; error: string; needsLogin?: boolean };

type UserClient = Awaited<ReturnType<typeof createClient>>;

async function ensureCart(supabase: UserClient, userId: string): Promise<string | null> {
  const { cartId } = await readUserCart(supabase, userId);
  if (cartId) return cartId;
  const { data, error } = await supabase
    .from("carts")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("id")
    .single();
  return error ? null : data.id;
}

async function writeLine(
  supabase: UserClient,
  cartId: string,
  line: CartLineInput,
): Promise<boolean> {
  let query = supabase
    .from("cart_items")
    .select("id")
    .eq("cart_id", cartId)
    .eq("product_id", line.productId);
  query = line.variantId ? query.eq("variant_id", line.variantId) : query.is("variant_id", null);
  const { data: existing } = await query.maybeSingle();

  if (line.quantity <= 0) {
    if (!existing) return true;
    const { error } = await supabase.from("cart_items").delete().eq("id", existing.id);
    return !error;
  }
  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: line.quantity })
      .eq("id", existing.id);
    return !error;
  }
  const { error } = await supabase.from("cart_items").insert({
    cart_id: cartId,
    product_id: line.productId,
    variant_id: line.variantId,
    quantity: line.quantity,
  });
  return !error;
}

/**
 * Gabung keranjang guest ke tabel `carts` (qty = terbesar, dibatasi stok
 * tersedia), buang baris yang tidak tersedia, lalu kembalikan isi server
 * sebagai sumber kebenaran. `guestItems` kosong = sekadar memuat ulang.
 */
export async function syncCart(guestItems: CartLineInput[]): Promise<CartSyncResult> {
  const parsed = cartLinesInputSchema.safeParse(guestItems);
  if (!parsed.success) return { ok: false, error: "Data keranjang tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu.", needsLogin: true };
  if (user.isBlocked) return { ok: false, error: "Akun kamu diblokir." };

  const supabase = await createClient();
  const { items: serverItems } = await readUserCart(supabase, user.id);

  const merged = new Map<string, CartLineInput>();
  const keyOf = (i: CartLineInput) => `${i.productId}:${i.variantId ?? ""}`;
  for (const i of serverItems) merged.set(keyOf(i), i);
  for (const i of parsed.data) {
    const prev = merged.get(keyOf(i));
    merged.set(keyOf(i), { ...i, quantity: Math.max(prev?.quantity ?? 0, i.quantity) });
  }
  const wanted = [...merged.values()].slice(0, 100);

  let lines: CartLine[];
  try {
    lines = await priceCartLines(wanted);
  } catch {
    return { ok: false, error: "Keranjang gagal dimuat. Coba lagi." };
  }

  const cartId = wanted.length ? await ensureCart(supabase, user.id) : null;
  let removed = 0;
  const kept: CartLine[] = [];
  for (const line of lines) {
    const before = serverItems.find((s) => keyOf(s) === keyOf(line));
    let quantity = line.quantity;
    if (line.status === "unavailable" || line.available <= 0) {
      quantity = 0;
      removed += 1;
    } else if (line.quantity > line.available) {
      quantity = line.available;
    }
    if (cartId && before?.quantity !== quantity) {
      await writeLine(supabase, cartId, { ...line, quantity });
    }
    if (quantity > 0) {
      kept.push({ ...line, quantity, status: "ok" });
    }
  }
  return { ok: true, lines: kept, removed };
}

const setSchema = cartLineInputSchema.extend({ quantity: z.number().int().min(0).max(999) });

/** Simpan qty absolut satu baris keranjang user (0 = hapus). */
export async function setCartItem(
  input: z.infer<typeof setSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data keranjang tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (user.isBlocked) return { ok: false, error: "Akun kamu diblokir." };

  const supabase = await createClient();
  const cartId = await ensureCart(supabase, user.id);
  if (!cartId) return { ok: false, error: "Keranjang gagal disimpan." };
  const ok = await writeLine(supabase, cartId, parsed.data);
  return ok ? { ok: true } : { ok: false, error: "Keranjang gagal disimpan." };
}
