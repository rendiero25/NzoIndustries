import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * Data referensi katalog yang jarang berubah, di-cache 1 jam (tag `catalog`).
 * Admin yang mengubah kategori/brand/kendaraan memanggil revalidateTag("catalog").
 */
export const CATALOG_TAG = "catalog";
const REVALIDATE = 3600;

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  isAutomotive: boolean;
  children: CategoryNode[];
};

export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const { data, error } = await createPublicClient()
      .from("categories")
      .select("id, slug, name, parent_id, is_automotive, sort_order")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(`categories: ${error.message}`);
    const nodes = new Map<string, CategoryNode & { parentId: string | null }>();
    for (const c of data ?? []) {
      nodes.set(c.id, {
        id: c.id,
        slug: c.slug,
        name: c.name,
        isAutomotive: c.is_automotive,
        parentId: c.parent_id,
        children: [],
      });
    }
    const roots: CategoryNode[] = [];
    for (const n of nodes.values()) {
      const parent = n.parentId ? nodes.get(n.parentId) : undefined;
      if (parent) parent.children.push(n);
      else roots.push(n);
    }
    return roots;
  },
  ["category-tree"],
  { revalidate: REVALIDATE, tags: [CATALOG_TAG] },
);

export type CategoryLookup = { node: CategoryNode; parent: CategoryNode | null };

export async function findCategory(slug: string): Promise<CategoryLookup | null> {
  const tree = await getCategoryTree();
  for (const root of tree) {
    if (root.slug === slug) return { node: root, parent: null };
    const child = root.children.find((c) => c.slug === slug);
    if (child) return { node: child, parent: root };
  }
  return null;
}

export type BrandSummary = {
  slug: string;
  name: string;
  logoPublicId: string | null;
  productCount: number;
};

export const getBrands = unstable_cache(
  async (): Promise<BrandSummary[]> => {
    const { data, error } = await createPublicClient().rpc("catalog_brands");
    if (error) throw new Error(`brands: ${error.message}`);
    return (data ?? []).map((b) => ({
      slug: b.slug,
      name: b.name,
      logoPublicId: b.logo_public_id,
      productCount: Number(b.product_count),
    }));
  },
  ["catalog-brands"],
  { revalidate: REVALIDATE, tags: [CATALOG_TAG] },
);

export type VehicleMake = { id: string; slug: string; name: string; type: "motorcycle" | "car" };
export type VehicleModel = {
  id: string;
  makeId: string;
  slug: string;
  name: string;
  type: "motorcycle" | "car";
  yearStart: number;
  yearEnd: number | null;
};

export const getVehicleCatalog = unstable_cache(
  async (): Promise<{ makes: VehicleMake[]; models: VehicleModel[] }> => {
    const supabase = createPublicClient();
    const [makes, models] = await Promise.all([
      supabase
        .from("vehicle_makes")
        .select("id, slug, name, vehicle_type, sort_order")
        .order("vehicle_type")
        .order("sort_order"),
      supabase
        .from("vehicle_models")
        .select("id, make_id, slug, name, vehicle_type, year_start, year_end")
        .order("name"),
    ]);
    if (makes.error) throw new Error(`vehicle_makes: ${makes.error.message}`);
    if (models.error) throw new Error(`vehicle_models: ${models.error.message}`);
    return {
      makes: (makes.data ?? []).map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        type: m.vehicle_type,
      })),
      models: (models.data ?? []).map((m) => ({
        id: m.id,
        makeId: m.make_id,
        slug: m.slug,
        name: m.name,
        type: m.vehicle_type,
        yearStart: m.year_start,
        yearEnd: m.year_end,
      })),
    };
  },
  ["vehicle-catalog"],
  { revalidate: REVALIDATE, tags: [CATALOG_TAG] },
);

export type StoreStats = { products: number; brands: number; vehicleModels: number };

export const getStoreStats = unstable_cache(
  async (): Promise<StoreStats> => {
    const { data, error } = await createPublicClient().rpc("catalog_stats");
    if (error) throw new Error(`stats: ${error.message}`);
    const s = (data ?? {}) as { products?: number; brands?: number; vehicle_models?: number };
    return {
      products: s.products ?? 0,
      brands: s.brands ?? 0,
      vehicleModels: s.vehicle_models ?? 0,
    };
  },
  ["store-stats"],
  { revalidate: REVALIDATE, tags: [CATALOG_TAG] },
);
