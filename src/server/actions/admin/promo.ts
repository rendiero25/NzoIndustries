"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { verifyUploadedImage } from "@/lib/cloudinary/verify";
import { createClient } from "@/lib/supabase/server";
import {
  bannerSchema,
  CONTENT_PAGE_SLUGS,
  contentPageSchema,
  flashSaleItemSchema,
  flashSaleSchema,
  voucherSchema,
  type BannerValues,
  type ContentPageValues,
  type FlashSaleItemValues,
  type FlashSaleValues,
  type VoucherValues,
} from "@/lib/validations/admin-promo";
import { searchProductsForPick, type ProductPick } from "@/server/queries/admin/promo";
import { CONTENT_TAG } from "@/server/queries/content";
import { CATALOG_TAG } from "@/server/queries/reference";

import { adminGuard, ROLES, rpcMessage } from "./_guard";

type Result = { ok: true } | { ok: false; error: string };

const idSchema = z.uuid();
const MAX_BANNER_BYTES = 5 * 1024 * 1024;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

// ---------------------------------------------------------------- voucher

export async function saveVoucher(id: string | null, input: VoucherValues): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = voucherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Voucher tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  if (id && v.usageLimit !== null) {
    const { data: cur } = await supabase
      .from("vouchers")
      .select("used_count")
      .eq("id", id)
      .maybeSingle();
    if (cur && v.usageLimit < cur.used_count) {
      return { ok: false, error: `Kuota tidak boleh kurang dari pemakaian (${cur.used_count}).` };
    }
  }

  const row = {
    code: v.code,
    description: v.description ?? null,
    discount_type: v.discountType,
    discount_value: v.discountValue,
    max_discount: v.discountType === "percent" ? v.maxDiscount : null,
    min_subtotal: v.minSubtotal,
    usage_limit: v.usageLimit,
    per_user_limit: v.perUserLimit,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    is_active: v.isActive,
    is_public: v.isPublic,
  };
  const { error } = id
    ? await supabase.from("vouchers").update(row).eq("id", id)
    : await supabase.from("vouchers").insert(row);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Kode voucher sudah dipakai."
          : rpcMessage(error, "Voucher gagal disimpan."),
    };
  }
  revalidatePath("/admin/vouchers");
  revalidatePath("/account/vouchers");
  return { ok: true };
}

export async function deleteVoucher(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Voucher tidak valid." };
  const supabase = await createClient();
  // voucher_redemptions on delete restrict: voucher yang sudah dipakai tetap tersimpan.
  const { error } = await supabase.from("vouchers").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "Voucher sudah pernah dipakai. Nonaktifkan saja."
          : "Voucher gagal dihapus.",
    };
  }
  revalidatePath("/admin/vouchers");
  revalidatePath("/account/vouchers");
  return { ok: true };
}

// ---------------------------------------------------------------- flash sale

function revalidateSale(id?: string) {
  revalidateTag(CATALOG_TAG, "max");
  revalidatePath("/");
  revalidatePath("/admin/flash-sales");
  if (id) revalidatePath(`/admin/flash-sales/${id}`);
}

export async function saveFlashSale(
  id: string | null,
  input: FlashSaleValues,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = flashSaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Flash sale tidak valid." };
  const v = parsed.data;
  const row = {
    name: v.name,
    subtitle: v.subtitle ?? null,
    starts_at: v.startsAt!,
    ends_at: v.endsAt!,
    is_active: v.isActive,
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("flash_sales").update(row).eq("id", id).select("id").single()
    : await supabase.from("flash_sales").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: rpcMessage(error, "Flash sale gagal disimpan.") };
  revalidateSale(data.id);
  return { ok: true, id: data.id };
}

export async function deleteFlashSale(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Flash sale tidak valid." };
  const supabase = await createClient();
  const { data: sold } = await supabase
    .from("flash_sale_items")
    .select("sold")
    .eq("flash_sale_id", id)
    .gt("sold", 0)
    .limit(1);
  if (sold?.length)
    return { ok: false, error: "Flash sale sudah ada penjualan. Nonaktifkan saja." };
  const { error } = await supabase.from("flash_sales").delete().eq("id", id);
  if (error) return { ok: false, error: "Flash sale gagal dihapus." };
  revalidateSale();
  return { ok: true };
}

export async function saveFlashSaleItem(
  itemId: string | null,
  input: FlashSaleItemValues,
): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = flashSaleItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (itemId !== null && !idSchema.safeParse(itemId).success)
    return { ok: false, error: "Item tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  // Harga normal dari DB (rule 4): harga sale wajib di bawahnya.
  const { data: product } = await supabase
    .from("products")
    .select("price, variants:product_variants(id, price, is_active)")
    .eq("id", v.productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Produk tidak ditemukan." };
  const activeVariants = (product.variants ?? []).filter((x) => x.is_active);
  if (activeVariants.length && !v.variantId)
    return { ok: false, error: "Produk bervarian: pilih varian." };
  const variant = v.variantId ? activeVariants.find((x) => x.id === v.variantId) : null;
  if (v.variantId && !variant) return { ok: false, error: "Varian tidak ditemukan." };
  const normal = Number(variant?.price ?? product.price);
  if (v.salePrice >= normal) {
    return {
      ok: false,
      error: `Harga flash sale harus di bawah harga normal (Rp${normal.toLocaleString("id-ID")}).`,
    };
  }

  const row = {
    flash_sale_id: v.flashSaleId,
    product_id: v.productId,
    variant_id: v.variantId,
    sale_price: v.salePrice,
    quota: v.quota,
  };
  let error;
  if (itemId) {
    ({ error } = await supabase
      .from("flash_sale_items")
      .update({ sale_price: row.sale_price, quota: row.quota })
      .eq("id", itemId)
      .eq("flash_sale_id", v.flashSaleId));
  } else {
    const { data: last } = await supabase
      .from("flash_sale_items")
      .select("sort_order")
      .eq("flash_sale_id", v.flashSaleId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    ({ error } = await supabase
      .from("flash_sale_items")
      .insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 }));
  }
  if (error) {
    const message =
      error.code === "23505"
        ? "Produk/varian ini sudah ada di flash sale."
        : error.code === "23514"
          ? "Kuota tidak boleh kurang dari jumlah terjual."
          : "Item gagal disimpan.";
    return { ok: false, error: message };
  }
  revalidateSale(v.flashSaleId);
  return { ok: true };
}

export async function deleteFlashSaleItem(flashSaleId: string, itemId: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(itemId).success || !idSchema.safeParse(flashSaleId).success)
    return { ok: false, error: "Item tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("flash_sale_items")
    .delete()
    .eq("id", itemId)
    .eq("flash_sale_id", flashSaleId);
  if (error) return { ok: false, error: "Item gagal dihapus." };
  revalidateSale(flashSaleId);
  return { ok: true };
}

export async function searchFlashSaleProducts(
  q: string,
): Promise<{ ok: true; items: ProductPick[] } | { ok: false; error: string }> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const term = z.string().trim().max(80).safeParse(q);
  if (!term.success) return { ok: false, error: "Kata kunci terlalu panjang." };
  try {
    return { ok: true, items: await searchProductsForPick(term.data) };
  } catch {
    return { ok: false, error: "Pencarian gagal." };
  }
}

// ---------------------------------------------------------------- banner

function revalidateBanners() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/banners");
}

export async function saveBanner(id: string | null, input: BannerValues): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Banner tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: cur } = id
    ? await supabase
        .from("banners")
        .select("image_public_id, mobile_image_public_id")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  for (const [next, prev] of [
    [v.imagePublicId, cur?.image_public_id],
    [v.mobileImagePublicId, cur?.mobile_image_public_id],
  ] as const) {
    if (next && next !== prev) {
      const check = await verifyUploadedImage(next, "banners", MAX_BANNER_BYTES);
      if (!check.ok) return check;
    }
  }

  const row = {
    placement: v.placement,
    title: v.title ?? null,
    subtitle: v.subtitle ?? null,
    image_public_id: v.placement === "promo_bar" ? null : v.imagePublicId,
    mobile_image_public_id: v.placement === "promo_bar" ? null : v.mobileImagePublicId,
    link_url: v.linkUrl,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    is_active: v.isActive,
  };
  let error;
  if (id) {
    ({ error } = await supabase.from("banners").update(row).eq("id", id));
  } else {
    const { data: last } = await supabase
      .from("banners")
      .select("sort_order")
      .eq("placement", v.placement)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    ({ error } = await supabase
      .from("banners")
      .insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 }));
  }
  if (error) return { ok: false, error: rpcMessage(error, "Banner gagal disimpan.") };
  revalidateBanners();
  return { ok: true };
}

export async function moveBanner(id: string, direction: "up" | "down"): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Banner tidak valid." };
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("banners")
    .select("id, placement, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Banner tidak ditemukan." };
  const { data: list } = await supabase
    .from("banners")
    .select("id, sort_order")
    .eq("placement", cur.placement)
    .order("sort_order")
    .order("created_at");
  const rows = list ?? [];
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j]!, rows[i]!];
  // Tulis ulang urutan 1..n supaya nilai kembar ikut rapi.
  for (const [index, r] of rows.entries()) {
    if (r.sort_order !== index + 1) {
      const { error } = await supabase
        .from("banners")
        .update({ sort_order: index + 1 })
        .eq("id", r.id);
      if (error) return { ok: false, error: "Urutan gagal disimpan." };
    }
  }
  revalidateBanners();
  return { ok: true };
}

export async function deleteBanner(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Banner tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { ok: false, error: "Banner gagal dihapus." };
  revalidateBanners();
  return { ok: true };
}

// ---------------------------------------------------------------- halaman statis (D-39)

const PUBLIC_PATH: Record<(typeof CONTENT_PAGE_SLUGS)[number], string> = {
  about: "/about",
  faq: "/faq",
  "how-to-buy": "/how-to-buy",
  contact: "/contact",
  privacy: "/kebijakan-privasi",
  terms: "/syarat-ketentuan",
  "returns-policy": "/kebijakan-pengembalian",
};

export async function saveContentPage(slug: string, input: ContentPageValues): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const s = z.enum(CONTENT_PAGE_SLUGS).safeParse(slug);
  if (!s.success) return { ok: false, error: "Halaman tidak dikenal." };
  const parsed = contentPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_pages")
    .update({
      title: v.title,
      body: v.body,
      meta_description: v.metaDescription ?? null,
      is_published: v.isPublished,
      updated_by: guard.user.id,
    })
    .eq("slug", s.data)
    .select("id");
  if (error || !data?.length)
    return { ok: false, error: rpcMessage(error, "Halaman gagal disimpan.") };
  revalidateTag(CONTENT_TAG, "max");
  revalidatePath(PUBLIC_PATH[s.data]);
  revalidatePath("/admin/pages");
  return { ok: true };
}
