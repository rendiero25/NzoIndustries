"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { parseVehicleCookie, VEHICLE_COOKIE } from "@/lib/vehicle-cookie";
import { setActiveVehicle } from "@/server/actions/vehicle";

const idSchema = z.object({ id: z.uuid() });

type Result = { ok: true } | { ok: false; error: string };

/** Jadikan kendaraan Garasi sebagai kendaraan aktif (cookie + default). */
export async function setDefaultVehicle(input: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kendaraan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_vehicles")
    .select("model_id, year")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Kendaraan tidak ditemukan." };
  const res = await setActiveVehicle({ modelId: data.model_id, year: data.year });
  if (!res.ok) return res;
  revalidatePath("/account/garage");
  return { ok: true };
}

/** Hapus dari Garasi; bila itu kendaraan aktif di browser ini, cookie ikut dilepas. */
export async function removeVehicle(input: { id: string }): Promise<Result> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kendaraan tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_vehicles")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("model_id, year")
    .maybeSingle();
  if (!data) return { ok: false, error: "Kendaraan tidak ditemukan." };

  const store = await cookies();
  const active = parseVehicleCookie(store.get(VEHICLE_COOKIE)?.value);
  if (active && active.modelId === data.model_id && active.year === data.year) {
    store.delete(VEHICLE_COOKIE);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
