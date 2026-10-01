"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/legacy/server";
import { z } from "zod";

const brandSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: huruf kecil, angka, dan tanda hubung"),
  logo_url: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url("URL logo tidak valid").nullable(),
  ),
  is_active: z.boolean(),
});

export type BrandInput = z.infer<typeof brandSchema>;

type ActionResult = { error: string } | { id: string };

export async function createBrand(data: BrandInput): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServiceClient();

  const { data: result, error } = await supabase
    .from("brands")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      logo_url: parsed.data.logo_url,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan merek lain." };
    return { error: error.message };
  }

  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  return { id: result.id };
}

export async function updateBrand(id: string, data: BrandInput): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("brands")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      logo_url: parsed.data.logo_url,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan merek lain." };
    return { error: error.message };
  }

  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${id}/edit`);
  revalidatePath("/admin/products");
  return { id };
}

export async function deleteBrand(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id)
    .is("deleted_at", null);

  if (productCount && productCount > 0) {
    return { error: `Merek masih memiliki ${productCount} produk aktif.` };
  }

  const { error } = await supabase.from("brands").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/brands");
  return {};
}

export async function toggleBrandStatus(
  id: string,
  is_active: boolean,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("brands").update({ is_active }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/brands");
  return {};
}
