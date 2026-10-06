import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imagePublicId: string;
  mobileImagePublicId: string | null;
  href: string | null;
};

/** Banner aktif per placement (RLS: aktif & dalam jadwal). */
export async function getBanners(placement: "hero" | "promo"): Promise<Banner[]> {
  const { data, error } = await createPublicClient()
    .from("banners")
    .select("id, title, subtitle, image_public_id, mobile_image_public_id, link_url, sort_order")
    .eq("placement", placement)
    .order("sort_order")
    .limit(8);
  if (error) throw new Error(`banners: ${error.message}`);
  return (data ?? [])
    .filter((b) => b.image_public_id.startsWith("nzo/"))
    .map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      imagePublicId: b.image_public_id,
      mobileImagePublicId: b.mobile_image_public_id,
      // Hanya link internal (hindari open redirect / phishing dari data banner).
      href:
        b.link_url && b.link_url.startsWith("/") && !b.link_url.startsWith("//")
          ? b.link_url
          : null,
    }));
}

export type FlashSaleItem = {
  productId: string;
  slug: string;
  name: string;
  imagePublicId: string | null;
  salePrice: number;
  normalPrice: number;
  quota: number | null;
  sold: number;
  stock: number;
};

export type ActiveFlashSale = {
  id: string;
  name: string;
  subtitle: string | null;
  endsAt: string;
  items: FlashSaleItem[];
};

/** Flash sale yang sedang berjalan (paling cepat berakhir) beserta itemnya. */
export async function getActiveFlashSale(): Promise<ActiveFlashSale | null> {
  const now = new Date().toISOString();
  const supabase = createPublicClient();
  const { data: sale, error } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, ends_at")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("ends_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`flash_sales: ${error.message}`);
  if (!sale) return null;

  const { data: items, error: itemsError } = await supabase
    .from("flash_sale_items")
    .select(
      "product_id, sale_price, quota, sold, sort_order, product:products(slug, name, price, stock, status, images:product_images(public_id, sort_order))",
    )
    .eq("flash_sale_id", sale.id)
    .is("variant_id", null)
    .order("sort_order")
    .limit(12);
  if (itemsError) throw new Error(`flash_sale_items: ${itemsError.message}`);

  const mapped = (items ?? []).flatMap((i) => {
    const p = i.product;
    if (!p || p.status !== "published") return [];
    const image = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return [
      {
        productId: i.product_id,
        slug: p.slug,
        name: p.name,
        imagePublicId: image?.public_id ?? null,
        salePrice: Number(i.sale_price),
        normalPrice: Number(p.price),
        quota: i.quota,
        sold: i.sold,
        stock: p.stock,
      },
    ];
  });
  if (!mapped.length) return null;
  return {
    id: sale.id,
    name: sale.name,
    subtitle: sale.subtitle,
    endsAt: sale.ends_at,
    items: mapped,
  };
}
