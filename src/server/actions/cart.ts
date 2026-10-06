"use server";

import { z } from "zod";

import { effectivePrice } from "@/lib/money";
import { createPublicClient } from "@/lib/supabase/public";

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
