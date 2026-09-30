"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: huruf kecil, angka, dan tanda hubung"),
  parent_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()),
  image_url: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url("URL gambar tidak valid").nullable(),
  ),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

type ActionResult = { error: string } | { id: string };

export async function createCategory(data: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createServiceClient();

  const { data: result, error } = await supabase
    .from("categories")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parent_id,
      image_url: parsed.data.image_url,
      sort_order: parsed.data.sort_order,
      is_active: parsed.data.is_active,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan kategori lain." };
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { id: result.id };
}

export async function updateCategory(id: string, data: CategoryInput): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.parent_id === id) {
    return { error: "Kategori tidak bisa menjadi parent sendiri." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      parent_id: parsed.data.parent_id,
      image_url: parsed.data.image_url,
      sort_order: parsed.data.sort_order,
      is_active: parsed.data.is_active,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan kategori lain." };
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}/edit`);
  return { id };
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { count: childCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if (childCount && childCount > 0) {
    return { error: `Hapus ${childCount} subkategori terlebih dahulu.` };
  }

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);

  if (productCount && productCount > 0) {
    return { error: `Kategori masih memiliki ${productCount} produk aktif.` };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/categories");
  return {};
}

export async function toggleCategoryStatus(
  id: string,
  is_active: boolean,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/categories");
  return {};
}
