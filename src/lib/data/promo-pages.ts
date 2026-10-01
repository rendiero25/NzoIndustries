import "server-only";

import { cache } from "react";

import { createServiceClient } from "@/lib/supabase/legacy/server";
import { resolvePromotionShelfProducts } from "@/lib/data/home-storefront";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

export type FlashSalePageData = {
  id: string;
  name: string;
  subtitle: string | null;
  startsAt: string | null;
  endsAt: string | null;
  products: HomeShelfProduct[];
};

export type PromotionPageData = {
  id: string;
  type: "second_products" | "featured_products";
  title: string;
  subtitle: string | null;
  products: HomeShelfProduct[];
};

export const fetchFlashSalePageData = cache(
  async (id: string): Promise<FlashSalePageData | null> => {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("flash_sales")
        .select("id, name, subtitle, starts_at, ends_at, is_active")
        .eq("id", id)
        .maybeSingle();

      if (error || !data || data.is_active === false) return null;

      // Belum mulai → 404
      if (data.starts_at && new Date(data.starts_at) > new Date()) return null;

      const { data: fsp } = await supabase
        .from("flash_sale_products")
        .select(
          `variant_id, sale_price, sold,
         product_variants:variant_id (
           id, price, name,
           products:product_id (
             id, name, slug, average_rating, review_count, total_sold, condition,
             brands:brand_id(name),
             categories:category_id(name),
             product_images(url, is_primary, sort_order, alt_text)
           )
         )`,
        )
        .eq("flash_sale_id", data.id);

      const products: HomeShelfProduct[] = [];
      for (const row of fsp ?? []) {
        const r = row as {
          variant_id: string;
          sale_price: number;
          sold: number;
          product_variants: {
            id: string;
            price: number;
            name: string;
            products: {
              id: string;
              name: string;
              slug: string;
              average_rating: number | null;
              review_count: number | null;
              total_sold: number | null;
              condition: string | null;
              brands: { name: string } | { name: string }[] | null;
              categories: { name: string } | { name: string }[] | null;
              product_images:
                | {
                    url: string;
                    is_primary: boolean | null;
                    sort_order: number | null;
                    alt_text: string | null;
                  }[]
                | null;
            } | null;
          } | null;
        };
        const pv = r.product_variants;
        const pr = pv?.products;
        if (!pv || !pr) continue;

        const brand = Array.isArray(pr.brands) ? (pr.brands[0] ?? null) : pr.brands;
        const cat = Array.isArray(pr.categories) ? (pr.categories[0] ?? null) : pr.categories;
        const eyebrow = [brand?.name, cat?.name].filter(Boolean).join(" · ") || "Flash sale";
        const images = pr.product_images ?? [];
        const primary =
          images.find((i) => i.is_primary) ??
          [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0] ??
          null;
        const base = Number(pv.price);
        const sale = Number(r.sale_price);

        products.push({
          productId: pr.id,
          variantId: r.variant_id,
          name: pr.name,
          slug: pr.slug,
          eyebrow,
          variantName: pv.name ?? null,
          imageUrl: primary?.url ?? null,
          imageAlt: primary?.alt_text ?? pr.name,
          currentPrice: sale,
          compareAtPrice: base > sale ? base : null,
          rating: Number(pr.average_rating ?? 0),
          reviewCount: pr.review_count ?? 0,
          soldCount: r.sold ?? 0,
          categoryName: cat?.name ?? null,
          brandName: brand?.name ?? null,
          condition: pr.condition === "new" || pr.condition === "second" ? pr.condition : null,
        });
      }

      return {
        id: data.id,
        name: data.name,
        subtitle: data.subtitle ?? null,
        startsAt: data.starts_at ?? null,
        endsAt: data.ends_at ?? null,
        products,
      };
    } catch {
      return null;
    }
  },
);

export const fetchPromotionPageData = cache(
  async (id: string): Promise<PromotionPageData | null> => {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("promotions")
        .select("id, type, title, subtitle, is_active")
        .eq("id", id)
        .maybeSingle();

      if (error || !data || data.is_active === false) return null;

      const type = data.type as "second_products" | "featured_products";
      if (type !== "second_products" && type !== "featured_products") return null;

      const products = await resolvePromotionShelfProducts(data.id, type);

      return {
        id: data.id,
        type,
        title: data.title,
        subtitle: data.subtitle ?? null,
        products,
      };
    } catch {
      return null;
    }
  },
);
