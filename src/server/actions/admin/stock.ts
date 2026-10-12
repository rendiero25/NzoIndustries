"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { CATALOG_TAG } from "@/server/queries/reference";

import { adminGuard, ROLES } from "./_guard";
import { listMovements, type MovementRow } from "@/server/queries/admin/stock";

const adjustSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  mode: z.enum(["add", "subtract", "set"]),
  quantity: z.coerce.number().int().min(0).max(100000),
  type: z.enum(["adjustment", "correction", "initial", "return"]),
  reason: z.string().trim().min(3, "Tulis alasan minimal 3 huruf.").max(200),
});

type Result = { ok: true; stock: number } | { ok: false; error: string };

/** Penyesuaian stok lewat ledger (`inventory_movements`); cache stok diperbarui trigger. */
export async function adjustStock(input: z.input<typeof adjustSchema>): Promise<Result> {
  const guard = await adminGuard(ROLES.stock);
  if (!guard.ok) return guard;
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const v = parsed.data;
  const supabase = await createClient();

  const current = v.variantId
    ? (
        await supabase
          .from("product_variants")
          .select("stock")
          .eq("id", v.variantId)
          .eq("product_id", v.productId)
          .maybeSingle()
      ).data
    : (await supabase.from("products").select("stock").eq("id", v.productId).maybeSingle()).data;
  if (!current) return { ok: false, error: "Produk tidak ditemukan." };

  const delta =
    v.mode === "add"
      ? v.quantity
      : v.mode === "subtract"
        ? -v.quantity
        : v.quantity - current.stock;
  if (delta === 0) return { ok: false, error: "Tidak ada perubahan stok." };
  if (current.stock + delta < 0)
    return { ok: false, error: `Stok tidak boleh negatif (sekarang ${current.stock}).` };

  const { error } = await supabase.from("inventory_movements").insert({
    product_id: v.productId,
    variant_id: v.variantId,
    quantity: delta,
    type: v.type,
    reason: v.reason,
    created_by: guard.user.id,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("variant_id")
        ? "Produk bervarian: pilih varian."
        : "Stok gagal disesuaikan.",
    };
  }
  revalidateTag(CATALOG_TAG, "max");
  revalidatePath("/admin/stock");
  return { ok: true, stock: current.stock + delta };
}

export async function getMovements(
  productId: string,
): Promise<{ ok: true; rows: MovementRow[] } | { ok: false; error: string }> {
  const guard = await adminGuard(ROLES.stock);
  if (!guard.ok) return guard;
  if (!z.uuid().safeParse(productId).success) return { ok: false, error: "Produk tidak valid." };
  return { ok: true, rows: await listMovements(productId) };
}
