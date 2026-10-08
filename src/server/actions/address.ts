"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  getShippingProvider,
  SHIPPING_NOT_CONFIGURED,
  type ShippingArea,
} from "@/lib/shipping/provider";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, type AddressInput } from "@/lib/validations/address";
import { ADDRESS_COLUMNS, toSavedAddress, type SavedAddress } from "@/server/queries/checkout";

/**
 * Buku alamat user (checkout sekarang, `/account` di Fase 7).
 * RLS `addresses_own_all` membatasi ke milik sendiri.
 */
export type AddressResult =
  | { ok: true; address: SavedAddress }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const idSchema = z.object({ id: z.uuid() });

/** Simpan alamat baru atau ubah alamat (`id` diisi). */
export async function saveAddress(input: AddressInput & { id?: string }): Promise<AddressResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (user.isBlocked) return { ok: false, error: "Akun kamu diblokir." };
  if (!(await checkRateLimit("address", user.id))) {
    return { ok: false, error: "Terlalu sering. Coba lagi sebentar lagi." };
  }

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa lagi data alamat.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const id = input.id ? idSchema.safeParse({ id: input.id }) : null;
  if (id && !id.success) return { ok: false, error: "Alamat tidak valid." };

  const v = parsed.data;
  const supabase = await createClient();
  const { count } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const makeDefault = v.isDefault === true || (count ?? 0) === 0;
  if (makeDefault) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const row = {
    user_id: user.id,
    label: v.label ? v.label : null,
    recipient: v.recipient,
    phone: v.phone,
    province: v.province,
    city: v.city,
    district: v.district,
    postal_code: v.postalCode,
    full_address: v.fullAddress,
    biteship_area_id: v.areaId,
    ...(makeDefault ? { is_default: true } : {}),
  };

  const query = id?.success
    ? supabase.from("addresses").update(row).eq("id", id.data.id).eq("user_id", user.id)
    : supabase.from("addresses").insert(row);
  const { data, error } = await query.select(ADDRESS_COLUMNS).single();
  if (error || !data) return { ok: false, error: "Alamat gagal disimpan." };

  revalidatePath("/checkout");
  return { ok: true, address: toSavedAddress(data) };
}

export async function deleteAddress(input: {
  id: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Alamat tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Alamat gagal dihapus." };
  revalidatePath("/checkout");
  return { ok: true };
}

export type AreaSearchResult = { ok: true; areas: ShippingArea[] } | { ok: false; error: string };

/** Cari kecamatan/kode pos untuk alamat (Biteship maps atau data uji). */
export async function searchShippingAreas(input: { query: string }): Promise<AreaSearchResult> {
  const parsed = z.object({ query: z.string().trim().min(3).max(80) }).safeParse(input);
  if (!parsed.success) return { ok: true, areas: [] };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("shippingRates", user.id))) {
    return { ok: false, error: "Terlalu sering. Coba lagi sebentar lagi." };
  }
  const provider = getShippingProvider();
  if (!provider) return { ok: false, error: SHIPPING_NOT_CONFIGURED };
  const result = await provider.searchAreas(parsed.data.query);
  return result.ok ? { ok: true, areas: result.data } : { ok: false, error: result.error };
}
