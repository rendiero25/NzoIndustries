import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { parseVehicleCookie, VEHICLE_COOKIE } from "@/lib/vehicle-cookie";

import { getVehicleCatalog } from "./reference";

export type ActiveVehicle = {
  modelId: string;
  year: number;
  makeName: string;
  modelName: string;
  type: "motorcycle" | "car";
  /** "Honda Vario 125 2022" */
  label: string;
  /** "Vario 125 · 2022" (chip header) */
  shortLabel: string;
};

/**
 * Kendaraan aktif: cookie `nzo_vehicle` (guest & user), lalu kendaraan default
 * di Garasi bila user login dan cookie kosong. Nilai cookie selalu dicek ke
 * daftar model; tahun harus di rentang produksi model.
 */
export const getActiveVehicle = cache(async (): Promise<ActiveVehicle | null> => {
  const store = await cookies();
  let picked = parseVehicleCookie(store.get(VEHICLE_COOKIE)?.value);

  if (!picked) {
    const user = await getCurrentUser();
    if (user) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("user_vehicles")
        .select("model_id, year")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();
      if (data) picked = { modelId: data.model_id, year: data.year };
    }
  }
  if (!picked) return null;

  const { makes, models } = await getVehicleCatalog();
  const model = models.find((m) => m.id === picked.modelId);
  if (!model) return null;
  const maxYear = new Date().getFullYear() + 1;
  if (picked.year < model.yearStart || picked.year > (model.yearEnd ?? maxYear)) return null;
  const make = makes.find((m) => m.id === model.makeId);
  const makeName = make?.name ?? "";
  return {
    modelId: model.id,
    year: picked.year,
    makeName,
    modelName: model.name,
    type: model.type,
    label: `${makeName} ${model.name} ${picked.year}`.trim(),
    shortLabel: `${model.name} · ${picked.year}`,
  };
});
