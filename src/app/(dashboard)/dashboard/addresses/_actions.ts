"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SimpleActionResult = { success: true } | { success: false; error: string };

/** Coerce a coordinate to a number within [min,max], else null (never throws). */
const coord = (min: number, max: number) =>
  z.preprocess((val) => {
    const n = typeof val === "number" ? val : typeof val === "string" ? parseFloat(val) : NaN;
    return Number.isFinite(n) && (n as number) >= min && (n as number) <= max ? n : null;
  }, z.number().nullable());

const addressSchema = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  province: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  kelurahan: z.string().trim().max(80).optional().default(""),
  postal_code: z.coerce.string().trim().min(3).max(10),
  full_address: z.string().trim().min(5).max(500),
  is_default: z.boolean().optional(),
  lat: coord(-11, 6).optional(),
  lng: coord(95, 141).optional(),
});

export async function createAddressAction(
  values: z.infer<typeof addressSchema>,
): Promise<SimpleActionResult> {
  try {
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: "Data alamat tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const v = parsed.data;
    if (v.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }

    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      label: v.label?.trim() || null,
      recipient: v.recipient.trim(),
      phone: v.phone.trim(),
      province: v.province.trim(),
      city: v.city.trim(),
      district: v.district.trim(),
      kelurahan: v.kelurahan?.trim() ?? "",
      postal_code: v.postal_code.trim(),
      full_address: v.full_address.trim(),
      is_default: v.is_default ?? false,
      lat: v.lat ?? null,
      lng: v.lng ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/addresses");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

const updateAddressSchema = addressSchema.extend({
  id: z.string().uuid(),
});

export async function updateAddressAction(
  values: z.infer<typeof updateAddressSchema>,
): Promise<SimpleActionResult> {
  try {
    const parsed = updateAddressSchema.safeParse(values);
    if (!parsed.success) return { success: false, error: "Data alamat tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const v = parsed.data;
    if (v.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }

    const { error } = await supabase
      .from("addresses")
      .update({
        label: v.label?.trim() || null,
        recipient: v.recipient.trim(),
        phone: v.phone.trim(),
        province: v.province.trim(),
        city: v.city.trim(),
        district: v.district.trim(),
        kelurahan: v.kelurahan?.trim() ?? "",
        postal_code: v.postal_code.trim(),
        full_address: v.full_address.trim(),
        is_default: v.is_default ?? false,
        lat: v.lat ?? null,
        lng: v.lng ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", v.id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/addresses");
    revalidatePath(`/dashboard/addresses/${v.id}/edit`);
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function deleteAddressAction(addressId: string): Promise<SimpleActionResult> {
  try {
    const id = z.string().uuid().safeParse(addressId);
    if (!id.success) return { success: false, error: "Alamat tidak valid." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Silakan masuk terlebih dahulu." };

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id.data)
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/addresses");
    return { success: true };
  } catch {
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}
