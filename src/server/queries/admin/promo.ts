import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BannerPlacement, ContentPageSlug } from "@/lib/validations/admin-promo";

// ---------------------------------------------------------------- voucher

export type AdminVoucher = {
  id: string;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxDiscount: number | null;
  minSubtotal: number;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isPublic: boolean;
  totalDiscount: number;
};

/** Semua voucher + total potongan yang sudah dipakai (RLS staf). */
export async function listAdminVouchers(q?: string): Promise<AdminVoucher[]> {
  const supabase = await createClient();
  let query = supabase
    .from("vouchers")
    .select(
      "id, code, description, discount_type, discount_value, max_discount, min_subtotal, usage_limit, per_user_limit, used_count, starts_at, ends_at, is_active, is_public, redemptions:voucher_redemptions(discount_amount)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("code", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(`vouchers: ${error.message}`);
  return (data ?? []).map((v) => ({
    id: v.id,
    code: String(v.code),
    description: v.description,
    discountType: v.discount_type,
    discountValue: Number(v.discount_value),
    maxDiscount: v.max_discount === null ? null : Number(v.max_discount),
    minSubtotal: Number(v.min_subtotal),
    usageLimit: v.usage_limit,
    perUserLimit: v.per_user_limit,
    usedCount: v.used_count,
    startsAt: v.starts_at,
    endsAt: v.ends_at,
    isActive: v.is_active,
    isPublic: v.is_public,
    totalDiscount: (v.redemptions ?? []).reduce((s, r) => s + Number(r.discount_amount), 0),
  }));
}

// ---------------------------------------------------------------- flash sale

export type AdminFlashSale = {
  id: string;
  name: string;
  subtitle: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  itemCount: number;
};

export async function listAdminFlashSales(): Promise<AdminFlashSale[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, starts_at, ends_at, is_active, items:flash_sale_items(count)")
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`flash sales: ${error.message}`);
  return (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    subtitle: f.subtitle,
    startsAt: f.starts_at,
    endsAt: f.ends_at,
    isActive: f.is_active,
    itemCount: f.items?.[0]?.count ?? 0,
  }));
}

export type AdminFlashSaleItem = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string;
  variantName: string | null;
  normalPrice: number;
  salePrice: number;
  quota: number | null;
  sold: number;
  stock: number;
  sortOrder: number;
  status: string;
};

export async function getAdminFlashSale(
  id: string,
): Promise<{ sale: AdminFlashSale; items: AdminFlashSaleItem[] } | null> {
  const supabase = await createClient();
  const { data: f, error } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, starts_at, ends_at, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`flash sale: ${error.message}`);
  if (!f) return null;
  const { data: items, error: itemsError } = await supabase
    .from("flash_sale_items")
    .select(
      "id, product_id, variant_id, sale_price, quota, sold, sort_order, product:products(name, sku, price, stock, status), variant:product_variants(name, sku, price, stock)",
    )
    .eq("flash_sale_id", id)
    .order("sort_order");
  if (itemsError) throw new Error(`flash sale items: ${itemsError.message}`);
  const rows = (items ?? []).map((i) => ({
    id: i.id,
    productId: i.product_id,
    variantId: i.variant_id,
    productName: i.product?.name ?? "(produk dihapus)",
    sku: i.variant?.sku ?? i.product?.sku ?? "",
    variantName: i.variant?.name ?? null,
    normalPrice: Number(i.variant?.price ?? i.product?.price ?? 0),
    salePrice: Number(i.sale_price),
    quota: i.quota,
    sold: i.sold,
    stock: i.variant?.stock ?? i.product?.stock ?? 0,
    sortOrder: i.sort_order,
    status: i.product?.status ?? "archived",
  }));
  return {
    sale: {
      id: f.id,
      name: f.name,
      subtitle: f.subtitle,
      startsAt: f.starts_at,
      endsAt: f.ends_at,
      isActive: f.is_active,
      itemCount: rows.length,
    },
    items: rows,
  };
}

export type ProductPick = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: string;
  variants: { id: string; name: string; sku: string; price: number | null; stock: number }[];
};

/** Cari produk untuk ditambahkan ke flash sale (nama/SKU, maks 15). */
export async function searchProductsForPick(q: string): Promise<ProductPick[]> {
  const term = q.replace(/[%_,()]/g, " ").trim();
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, sku, price, stock, status, variants:product_variants(id, name, sku, price, stock, is_active)",
    )
    .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
    .neq("status", "archived")
    .order("total_sold", { ascending: false })
    .limit(15);
  if (error) throw new Error(`product search: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: Number(p.price),
    stock: p.stock,
    status: p.status,
    variants: (p.variants ?? [])
      .filter((v) => v.is_active)
      .map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price === null ? null : Number(v.price),
        stock: v.stock,
      })),
  }));
}

// ---------------------------------------------------------------- banner

export type AdminBanner = {
  id: string;
  placement: BannerPlacement;
  title: string | null;
  subtitle: string | null;
  imagePublicId: string | null;
  mobileImagePublicId: string | null;
  linkUrl: string | null;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export async function listAdminBanners(): Promise<AdminBanner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select(
      "id, placement, title, subtitle, image_public_id, mobile_image_public_id, link_url, sort_order, starts_at, ends_at, is_active",
    )
    .order("placement")
    .order("sort_order");
  if (error) throw new Error(`banners: ${error.message}`);
  return (data ?? []).map((b) => ({
    id: b.id,
    placement: b.placement as BannerPlacement,
    title: b.title,
    subtitle: b.subtitle,
    imagePublicId: b.image_public_id,
    mobileImagePublicId: b.mobile_image_public_id,
    linkUrl: b.link_url,
    sortOrder: b.sort_order,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    isActive: b.is_active,
  }));
}

// ---------------------------------------------------------------- halaman statis

export type AdminContentPage = {
  id: string;
  slug: ContentPageSlug;
  title: string;
  body: string;
  metaDescription: string | null;
  isPublished: boolean;
  updatedAt: string;
};

export async function listAdminContentPages(): Promise<AdminContentPage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_pages")
    .select("id, slug, title, body, meta_description, is_published, updated_at")
    .order("slug");
  if (error) throw new Error(`content pages: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug as ContentPageSlug,
    title: p.title,
    body: p.body,
    metaDescription: p.meta_description,
    isPublished: p.is_published,
    updatedAt: p.updated_at,
  }));
}
