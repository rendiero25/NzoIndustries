"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  serializeVehicleCookie,
  VEHICLE_COOKIE,
  VEHICLE_COOKIE_MAX_AGE,
} from "@/lib/vehicle-cookie";
import { getVehicleCatalog } from "@/server/queries/reference";

export type VehicleActionResult = { ok: true; label: string } | { ok: false; error: string };

const schema = z.object({ modelId: z.uuid(), year: z.number().int().min(1950).max(2100) });

/**
 * Simpan kendaraan aktif (cookie untuk semua; Garasi default bila login).
 * Tahun wajib dalam rentang produksi model.
 */
export async function setActiveVehicle(
  input: z.infer<typeof schema>,
): Promise<VehicleActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pilih merek, model, dan tahun kendaraan." };
  const { modelId, year } = parsed.data;

  const { makes, models } = await getVehicleCatalog();
  const model = models.find((m) => m.id === modelId);
  if (!model) return { ok: false, error: "Model kendaraan tidak ditemukan." };
  const maxYear = new Date().getFullYear() + 1;
  if (year < model.yearStart || year > (model.yearEnd ?? maxYear)) {
    return { ok: false, error: `Tahun ${year} di luar masa produksi ${model.name}.` };
  }

  const store = await cookies();
  store.set(VEHICLE_COOKIE, serializeVehicleCookie({ modelId, year }), {
    path: "/",
    maxAge: VEHICLE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  const user = await getCurrentUser();
  if (user) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("user_vehicles")
      .select("id")
      .eq("user_id", user.id)
      .eq("model_id", modelId)
      .eq("year", year)
      .maybeSingle();
    // Satu default per user (unique index parsial): lepas default lama dulu.
    await supabase
      .from("user_vehicles")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
    if (existing) {
      await supabase.from("user_vehicles").update({ is_default: true }).eq("id", existing.id);
    } else {
      await supabase
        .from("user_vehicles")
        .insert({ user_id: user.id, model_id: modelId, year, is_default: true });
    }
  }

  revalidatePath("/", "layout");
  const make = makes.find((m) => m.id === model.makeId);
  return { ok: true, label: `${make?.name ?? ""} ${model.name} ${year}`.trim() };
}

/** Lepas kendaraan aktif dari browser ini (Garasi tidak dihapus). */
export async function clearActiveVehicle(): Promise<{ ok: true }> {
  const store = await cookies();
  store.delete(VEHICLE_COOKIE);
  const user = await getCurrentUser();
  if (user) {
    const supabase = await createClient();
    await supabase
      .from("user_vehicles")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
