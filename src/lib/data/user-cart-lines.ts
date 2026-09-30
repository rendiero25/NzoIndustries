import "server-only";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CartLineView } from "@/components/store/cart-line-card";
import { computeVariantUnitPrice } from "@/lib/utils/product-detail-pricing";

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

type ImgRow = {
  url: string;
  is_primary: boolean | null;
  sort_order: number | null;
  alt_text: string | null;
};

type CartQueryRow = {
  id: string;
  quantity: number;
  product_variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    reserved: number | null;
    weight: number;
    length: number;
    height: number;
    width: number;
    products: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      base_price: number;
      sale_price: number | null;
      average_rating: number | null;
      review_count: number | null;
      total_sold: number | null;
      category_id: string | null;
      brand_id: string | null;
      categories: { name: string } | { name: string }[] | null;
      product_images: ImgRow[] | null;
    } | null;
  } | null;
};

function sortImages(images: ImgRow[] | null | undefined): { url: string; alt: string | null }[] {
  if (!images?.length) return [];
  return [...images]
    .sort((a, b) => {
      const pa = a.is_primary ? 1 : 0;
      const pb = b.is_primary ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map((i) => ({ url: i.url, alt: i.alt_text }));
}

function excerpt(text: string | null | undefined): string {
  if (!text) return "";
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
}

export type UserCartWithLines = {
  cartId: string;
  lines: CartLineView[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
};

/**
 * Ambil keranjang + baris untuk halaman cart/checkout (user harus sudah login).
 */
export async function fetchUserCartWithLines(userId: string): Promise<UserCartWithLines | null> {
  const supabase = await createClient();

  // Single query: carts → cart_items → product_variants → products (saves one round-trip)
  const { data: cartData } = await supabase
    .from("carts")
    .select(
      `id,
      cart_items(
        id, quantity,
        product_variants(
          id, name, sku, price, stock, reserved, weight, length, height, width,
          products(
            id, name, slug, description, base_price, sale_price, average_rating, review_count, total_sold, category_id, brand_id,
            categories:category_id(name),
            product_images(url, is_primary, sort_order, alt_text)
          )
        )
      )`,
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!cartData) return null;
  const cart = { id: cartData.id };

  const items = ((cartData.cart_items as unknown[]) ?? []) as unknown as CartQueryRow[];
  if (!items.length)
    return { cartId: cart.id, lines: [], excludedProductIds: [], excludedCategoryIds: [] };

  // Fetch active flash sale prices for all variants in cart
  const variantIds = items.map((r) => r.product_variants?.id).filter(Boolean) as string[];
  const now = new Date();
  const serviceSupabase = createServiceClient();
  const { data: flashRows } = await serviceSupabase
    .from("flash_sale_products")
    .select("variant_id, sale_price, quota, sold, flash_sales(is_active, starts_at, ends_at)")
    .in("variant_id", variantIds);

  // Build map: variant_id → lowest valid flash sale price
  const flashPriceMap = new Map<string, number>();
  for (const row of flashRows ?? []) {
    const fs = Array.isArray(row.flash_sales) ? row.flash_sales[0] : row.flash_sales;
    if (!fs || !fs.is_active) continue;
    if (new Date(fs.starts_at) > now || new Date(fs.ends_at) < now) continue;
    const quota = row.quota as number | null;
    const sold = (row.sold as number) ?? 0;
    if (quota != null && quota > 0 && sold >= quota) continue;
    const existing = flashPriceMap.get(row.variant_id as string);
    const price = Number(row.sale_price);
    if (existing == null || price < existing) {
      flashPriceMap.set(row.variant_id as string, price);
    }
  }

  const lines: CartLineView[] = [];
  const excludedProductIds: string[] = [];
  const excludedCategoryIds: string[] = [];

  for (const r of items) {
    const v = r.product_variants;
    const p = v?.products;
    if (!v || !p) continue;
    const cat = firstRel(p.categories);
    if (p.category_id) excludedCategoryIds.push(p.category_id);
    excludedProductIds.push(p.id);

    const basePrice = Number(p.base_price);
    const productSalePrice = p.sale_price != null ? Number(p.sale_price) : null;
    const flashSalePrice = flashPriceMap.get(v.id) ?? null;

    // Flash sale price wins if it's lower than the product's sale price
    const effectiveSalePrice =
      flashSalePrice != null && (productSalePrice == null || flashSalePrice < productSalePrice)
        ? flashSalePrice
        : productSalePrice;

    const { listPrice, unitPrice, discountPercent } = computeVariantUnitPrice({
      basePrice,
      salePrice: effectiveSalePrice,
      variantPrice: Number(v.price),
    });

    const maxQty = Math.max(1, v.stock - (v.reserved ?? 0));

    const isFlashSale =
      flashSalePrice != null &&
      (productSalePrice == null || flashSalePrice < productSalePrice) &&
      unitPrice < listPrice;

    lines.push({
      lineId: r.id,
      qty: r.quantity,
      maxQty,
      variantId: v.id,
      variantName: v.name,
      productId: p.id,
      productName: p.name,
      slug: p.slug,
      categoryId: p.category_id ?? null,
      categoryLabel: cat?.name ?? "Produk",
      brandId: p.brand_id ?? null,
      descriptionExcerpt: excerpt(p.description),
      rating: Number(p.average_rating ?? 0),
      reviewCount: p.review_count ?? 0,
      soldCount: p.total_sold ?? 0,
      listPrice,
      unitPrice,
      discountPercent,
      isFlashSale,
      images: sortImages(p.product_images),
      sku: v.sku,
      weightGrams: Math.max(1, Math.round(Number(v.weight) || 1)),
    });
  }

  return { cartId: cart.id, lines, excludedProductIds, excludedCategoryIds };
}

export async function fetchVariantAsBuyNowLine(
  variantId: string,
  qty: number,
): Promise<CartLineView | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("product_variants")
    .select(
      `id, name, sku, price, stock, reserved, weight,
      products(
        id, name, slug, description, base_price, sale_price, average_rating, review_count, total_sold, category_id, brand_id,
        categories:category_id(name),
        product_images(url, is_primary, sort_order, alt_text)
      )`,
    )
    .eq("id", variantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return null;

  const p = firstRel(row.products as Parameters<typeof firstRel>[0]) as
    (typeof row.products & object) | null;
  if (!p || typeof p !== "object" || !("id" in p)) return null;

  const prod = p as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    base_price: number;
    sale_price: number | null;
    average_rating: number | null;
    review_count: number | null;
    total_sold: number | null;
    category_id: string | null;
    brand_id: string | null;
    categories: { name: string } | { name: string }[] | null;
    product_images: ImgRow[] | null;
  };

  const now = new Date();
  const serviceSupabase = createServiceClient();
  const { data: flashRows } = await serviceSupabase
    .from("flash_sale_products")
    .select("variant_id, sale_price, quota, sold, flash_sales(is_active, starts_at, ends_at)")
    .eq("variant_id", variantId);

  let flashSalePrice: number | null = null;
  for (const fr of flashRows ?? []) {
    const fs = Array.isArray(fr.flash_sales) ? fr.flash_sales[0] : fr.flash_sales;
    if (!fs?.is_active) continue;
    if (new Date(fs.starts_at) > now || new Date(fs.ends_at) < now) continue;
    const quota = fr.quota as number | null;
    const sold = (fr.sold as number) ?? 0;
    if (quota != null && quota > 0 && sold >= quota) continue;
    const price = Number(fr.sale_price);
    if (flashSalePrice == null || price < flashSalePrice) flashSalePrice = price;
  }

  const basePrice = Number(prod.base_price);
  const productSalePrice = prod.sale_price != null ? Number(prod.sale_price) : null;
  const effectiveSalePrice =
    flashSalePrice != null && (productSalePrice == null || flashSalePrice < productSalePrice)
      ? flashSalePrice
      : productSalePrice;

  const { listPrice, unitPrice, discountPercent } = computeVariantUnitPrice({
    basePrice,
    salePrice: effectiveSalePrice,
    variantPrice: Number(row.price),
  });

  const maxQty = Math.max(1, row.stock - (row.reserved ?? 0));
  const cat = firstRel(prod.categories);

  const isFlashSale =
    flashSalePrice != null &&
    (productSalePrice == null || flashSalePrice < productSalePrice) &&
    unitPrice < listPrice;

  return {
    lineId: "buy-now",
    qty: Math.min(Math.max(1, qty), maxQty),
    maxQty,
    variantId: row.id,
    variantName: row.name,
    productId: prod.id,
    productName: prod.name,
    slug: prod.slug,
    categoryId: prod.category_id ?? null,
    categoryLabel: cat?.name ?? "Produk",
    brandId: prod.brand_id ?? null,
    descriptionExcerpt: excerpt(prod.description),
    rating: Number(prod.average_rating ?? 0),
    reviewCount: prod.review_count ?? 0,
    soldCount: prod.total_sold ?? 0,
    listPrice,
    unitPrice,
    discountPercent,
    isFlashSale,
    images: sortImages(prod.product_images),
    sku: row.sku,
    weightGrams: Math.max(1, Math.round(Number(row.weight) || 1)),
  };
}
