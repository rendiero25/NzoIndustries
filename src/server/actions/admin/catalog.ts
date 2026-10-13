"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { buildCloudinaryFolder } from "@/lib/cloudinary/folders";
import { destroyAsset, getAsset, getCloudinaryConfig } from "@/lib/cloudinary/server";
import { ALLOWED_IMAGE_FORMATS } from "@/lib/cloudinary/signature";
import { createClient } from "@/lib/supabase/server";
import {
  brandSchema,
  categorySchema,
  reorderSchema,
  vehicleMakeSchema,
  vehicleModelSchema,
  type BrandValues,
  type CategoryValues,
  type VehicleMakeValues,
  type VehicleModelValues,
} from "@/lib/validations/admin-catalog";
import { listImportLogs, type ImportLogRow } from "@/server/queries/admin/catalog";
import { CATALOG_TAG } from "@/server/queries/reference";

import { adminGuard, ROLES, rpcMessage } from "./_guard";

type Result = { ok: true } | { ok: false; error: string };

const idSchema = z.uuid();

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Data tidak valid.";
}

/** Pesan constraint DB yang umum (slug kembar, FK). */
function dbMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  if (error?.code === "23505") return "Slug sudah dipakai. Ganti slug.";
  if (error?.code === "23503") return "Data masih dipakai di tempat lain.";
  return rpcMessage(error, fallback);
}

function revalidateCatalog(path: string) {
  revalidateTag(CATALOG_TAG, "max");
  revalidatePath(path);
}

// ---------------------------------------------------------------- kategori

export async function saveCategory(id: string | null, input: CategoryValues): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Kategori tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  // Cegah siklus: induk baru tidak boleh diri sendiri atau turunannya.
  if (id && v.parentId) {
    const { data: all } = await supabase.from("categories").select("id, parent_id");
    const children = new Map<string, string[]>();
    for (const c of all ?? []) {
      if (!c.parent_id) continue;
      children.set(c.parent_id, [...(children.get(c.parent_id) ?? []), c.id]);
    }
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === v.parentId)
        return { ok: false, error: "Induk tidak boleh kategori ini atau turunannya." };
      stack.push(...(children.get(cur) ?? []));
    }
  }

  const row = {
    name: v.name,
    slug: v.slug,
    parent_id: v.parentId,
    description: v.description ?? null,
    is_automotive: v.isAutomotive,
    is_active: v.isActive,
  };
  let error;
  if (id) {
    ({ error } = await supabase.from("categories").update(row).eq("id", id));
  } else {
    // Kategori baru di urutan terakhir saudaranya.
    let last = supabase
      .from("categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    last = v.parentId ? last.eq("parent_id", v.parentId) : last.is("parent_id", null);
    const { data: lastRow } = await last.maybeSingle();
    ({ error } = await supabase
      .from("categories")
      .insert({ ...row, sort_order: (lastRow?.sort_order ?? 0) + 1 }));
  }
  if (error) return { ok: false, error: dbMessage(error, "Kategori gagal disimpan.") };
  revalidateCatalog("/admin/categories");
  return { ok: true };
}

export async function reorderCategories(input: { ids: string[] }): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reorder_categories", { p_ids: parsed.data.ids });
  if (error) return { ok: false, error: rpcMessage(error, "Urutan gagal disimpan.") };
  revalidateCatalog("/admin/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Kategori tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_category", { p_id: id });
  if (error) return { ok: false, error: rpcMessage(error, "Kategori gagal dihapus.") };
  revalidateCatalog("/admin/categories");
  return { ok: true };
}

// ---------------------------------------------------------------- brand

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function verifyBrandLogo(publicId: string): Promise<Result> {
  const folder = buildCloudinaryFolder("brands");
  if (!publicId.startsWith(`${folder}/`) || publicId.includes("..")) {
    return { ok: false, error: "Logo harus diunggah ke folder brand." };
  }
  const config = getCloudinaryConfig();
  if (!config) return { ok: false, error: "Cloudinary belum dikonfigurasi." };
  const asset = await getAsset(config, publicId).catch(() => null);
  if (!asset) return { ok: false, error: "Logo tidak ditemukan di Cloudinary." };
  if (
    !(ALLOWED_IMAGE_FORMATS as readonly string[]).includes(asset.format) ||
    asset.bytes > MAX_LOGO_BYTES
  ) {
    await destroyAsset(config, publicId).catch(() => false);
    return { ok: false, error: "Logo harus JPG, PNG, atau WebP maksimal 2 MB." };
  }
  return { ok: true };
}

export async function saveBrand(id: string | null, input: BrandValues): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Brand tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  // Logo baru diverifikasi lewat Admin API: di nzo/brands, format & ukuran (rule 9).
  const logo = v.logoPublicId ?? null;
  if (logo) {
    const { data: cur } = id
      ? await supabase.from("brands").select("logo_public_id").eq("id", id).maybeSingle()
      : { data: null };
    if (cur?.logo_public_id !== logo) {
      const check = await verifyBrandLogo(logo);
      if (!check.ok) return check;
    }
  }

  const row = {
    name: v.name,
    slug: v.slug,
    description: v.description ?? null,
    logo_public_id: logo,
    is_active: v.isActive,
  };
  const { error } = id
    ? await supabase.from("brands").update(row).eq("id", id)
    : await supabase.from("brands").insert(row);
  if (error) return { ok: false, error: dbMessage(error, "Brand gagal disimpan.") };
  revalidateCatalog("/admin/brands");
  return { ok: true };
}

export async function deleteBrand(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Brand tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_brand", { p_id: id });
  if (error) return { ok: false, error: rpcMessage(error, "Brand gagal dihapus.") };
  revalidateCatalog("/admin/brands");
  return { ok: true };
}

// ---------------------------------------------------------------- kendaraan

export async function saveVehicleMake(
  id: string | null,
  input: VehicleMakeValues,
): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = vehicleMakeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Merek tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { data: cur } = await supabase
      .from("vehicle_makes")
      .select("vehicle_type")
      .eq("id", id)
      .maybeSingle();
    if (!cur) return { ok: false, error: "Merek tidak ditemukan." };
    if (cur.vehicle_type !== v.vehicleType) {
      const { count } = await supabase
        .from("vehicle_models")
        .select("id", { count: "exact", head: true })
        .eq("make_id", id);
      if (count)
        return {
          ok: false,
          error: "Jenis kendaraan tidak bisa diganti karena merek sudah punya model.",
        };
    }
  }

  const row = { name: v.name, slug: v.slug, vehicle_type: v.vehicleType, is_active: v.isActive };
  const { error } = id
    ? await supabase.from("vehicle_makes").update(row).eq("id", id)
    : await supabase.from("vehicle_makes").insert(row);
  if (error) return { ok: false, error: dbMessage(error, "Merek gagal disimpan.") };
  revalidateCatalog("/admin/vehicles");
  return { ok: true };
}

export async function deleteVehicleMake(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Merek tidak valid." };
  const supabase = await createClient();
  // FK vehicle_models on delete restrict: merek yang punya model tidak bisa dihapus.
  const { error } = await supabase.from("vehicle_makes").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23503"
          ? "Merek masih punya model. Hapus modelnya atau nonaktifkan merek."
          : "Merek gagal dihapus.",
    };
  }
  revalidateCatalog("/admin/vehicles");
  return { ok: true };
}

export async function saveVehicleModel(
  id: string | null,
  input: VehicleModelValues,
): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  const parsed = vehicleModelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (id !== null && !idSchema.safeParse(id).success)
    return { ok: false, error: "Model tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: make } = await supabase
    .from("vehicle_makes")
    .select("vehicle_type")
    .eq("id", v.makeId)
    .maybeSingle();
  if (!make) return { ok: false, error: "Merek tidak ditemukan." };

  const row = {
    make_id: v.makeId,
    name: v.name,
    slug: v.slug,
    vehicle_type: make.vehicle_type,
    year_start: v.yearStart,
    year_end: v.yearEnd,
    is_active: v.isActive,
  };
  const { error } = id
    ? await supabase.from("vehicle_models").update(row).eq("id", id)
    : await supabase.from("vehicle_models").insert(row);
  if (error) return { ok: false, error: dbMessage(error, "Model gagal disimpan.") };
  revalidateCatalog("/admin/vehicles");
  return { ok: true };
}

export async function deleteVehicleModel(id: string): Promise<Result> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Model tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_vehicle_model", { p_id: id });
  if (error) return { ok: false, error: rpcMessage(error, "Model gagal dihapus.") };
  revalidateCatalog("/admin/vehicles");
  return { ok: true };
}

// ---------------------------------------------------------------- import

export async function getImportLogs(
  batchId: string,
): Promise<{ ok: true; logs: ImportLogRow[] } | { ok: false; error: string }> {
  const guard = await adminGuard(ROLES.managers);
  if (!guard.ok) return guard;
  if (!idSchema.safeParse(batchId).success) return { ok: false, error: "Batch tidak valid." };
  try {
    return { ok: true, logs: await listImportLogs(batchId) };
  } catch {
    return { ok: false, error: "Log gagal dimuat." };
  }
}
