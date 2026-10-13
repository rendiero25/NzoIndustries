import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isAutomotive: boolean;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
};

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoPublicId: string | null;
  isActive: boolean;
  productCount: number;
};

export type AdminVehicleMake = {
  id: string;
  name: string;
  slug: string;
  vehicleType: "motorcycle" | "car";
  isActive: boolean;
  modelCount: number;
};

export type AdminVehicleModel = {
  id: string;
  makeId: string;
  name: string;
  slug: string;
  yearStart: number;
  yearEnd: number | null;
  isActive: boolean;
  fitmentCount: number;
};

type Counts = {
  categories: Record<string, number>;
  brands: Record<string, number>;
  models: Record<string, number>;
};

async function getCounts(): Promise<Counts> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_catalog_counts");
  const c = (data ?? {}) as Partial<Counts>;
  return { categories: c.categories ?? {}, brands: c.brands ?? {}, models: c.models ?? {} };
}

/** Semua kategori (termasuk nonaktif), urut induk lalu sort_order. Owner/admin (RLS). */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();
  const [{ data, error }, counts] = await Promise.all([
    supabase
      .from("categories")
      .select("id, parent_id, name, slug, description, is_automotive, is_active, sort_order")
      .order("sort_order")
      .order("name"),
    getCounts(),
  ]);
  if (error) throw new Error(`categories: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    isAutomotive: c.is_automotive,
    isActive: c.is_active,
    sortOrder: c.sort_order,
    productCount: counts.categories[c.id] ?? 0,
  }));
}

export async function listAdminBrands(q?: string): Promise<AdminBrand[]> {
  const supabase = await createClient();
  let query = supabase
    .from("brands")
    .select("id, name, slug, description, logo_public_id, is_active")
    .order("name")
    .limit(500);
  if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, " ")}%`);
  const [{ data, error }, counts] = await Promise.all([query, getCounts()]);
  if (error) throw new Error(`brands: ${error.message}`);
  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoPublicId: b.logo_public_id,
    isActive: b.is_active,
    productCount: counts.brands[b.id] ?? 0,
  }));
}

export async function listAdminVehicleMakes(): Promise<AdminVehicleMake[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicle_makes")
    .select("id, name, slug, vehicle_type, is_active, models:vehicle_models(count)")
    .order("vehicle_type")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`vehicle makes: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    vehicleType: m.vehicle_type,
    isActive: m.is_active,
    modelCount: m.models?.[0]?.count ?? 0,
  }));
}

export async function listAdminVehicleModels(makeId: string): Promise<AdminVehicleModel[]> {
  const supabase = await createClient();
  const [{ data, error }, counts] = await Promise.all([
    supabase
      .from("vehicle_models")
      .select("id, make_id, name, slug, year_start, year_end, is_active")
      .eq("make_id", makeId)
      .order("name"),
    getCounts(),
  ]);
  if (error) throw new Error(`vehicle models: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id,
    makeId: m.make_id,
    name: m.name,
    slug: m.slug,
    yearStart: m.year_start,
    yearEnd: m.year_end,
    isActive: m.is_active,
    fitmentCount: counts.models[m.id] ?? 0,
  }));
}

export type ImportLogRow = { id: number; level: string; sku: string | null; message: string };

/** Baris log (error/peringatan) satu batch import, maks 200. */
export async function listImportLogs(batchId: string): Promise<ImportLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_logs")
    .select("id, level, sku, message")
    .eq("batch_id", batchId)
    .order("id")
    .limit(200);
  if (error) throw new Error(`import logs: ${error.message}`);
  return data ?? [];
}
