import { NextResponse, type NextRequest } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { getBrands, getCategoryTree } from "@/server/queries/reference";

/**
 * Saran pencarian instan di header: 5 produk (RPC katalog, published saja)
 * + kategori/brand yang namanya cocok. Publik; respons di-cache singkat di CDN.
 */
export type SearchSuggestion = {
  products: { id: string; name: string; slug: string; price: number; image: string | null }[];
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
};

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  const empty: SearchSuggestion = { products: [], categories: [], brands: [] };
  if (q.length < 2) return NextResponse.json(empty);

  const [products, tree, brands] = await Promise.all([
    createPublicClient().rpc("catalog_search", { p_query: q, p_sort: "relevance", p_limit: 5 }),
    getCategoryTree(),
    getBrands(),
  ]);
  if (products.error) return NextResponse.json(empty, { status: 500 });

  const needle = q.toLowerCase();
  const categories = tree
    .flatMap((root) => [root, ...root.children])
    .filter((c) => c.slug !== "belum-dikategorikan" && c.name.toLowerCase().includes(needle))
    .slice(0, 3)
    .map((c) => ({ slug: c.slug, name: c.name }));
  const brandHits = brands
    .filter((b) => b.name.toLowerCase().includes(needle))
    .slice(0, 3)
    .map((b) => ({ slug: b.slug, name: b.name }));

  const body: SearchSuggestion = {
    products: (products.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      image: p.primary_image,
    })),
    categories,
    brands: brandHits,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
