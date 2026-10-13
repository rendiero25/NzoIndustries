import { z } from "zod";

import { SLUG_RE } from "./admin-product";

/** Schema form struktur katalog admin (Fase 8B). Sama dengan constraint DB. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const slug = z.string().trim().regex(SLUG_RE, "Slug huruf kecil, angka, dan tanda minus.").max(120);
const name = z.string().trim().min(2, "Nama minimal 2 huruf.").max(120);
const publicId = z
  .string()
  .trim()
  .max(255)
  .refine(
    (v) => v === "" || (v.startsWith("nzo/") && !v.includes("..")),
    "Gambar harus dari folder nzo/.",
  )
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const categorySchema = z.object({
  name,
  slug,
  parentId: z.uuid().nullable(),
  description: optionalText(1000),
  isAutomotive: z.boolean(),
  isActive: z.boolean(),
});
export type CategoryValues = z.input<typeof categorySchema>;

export const brandSchema = z.object({
  name,
  slug,
  description: optionalText(1000),
  logoPublicId: publicId,
  isActive: z.boolean(),
});
export type BrandValues = z.input<typeof brandSchema>;

export const VEHICLE_TYPES = ["motorcycle", "car"] as const;

export const vehicleMakeSchema = z.object({
  name,
  slug,
  vehicleType: z.enum(VEHICLE_TYPES),
  isActive: z.boolean(),
});
export type VehicleMakeValues = z.input<typeof vehicleMakeSchema>;

const year = z.coerce.number().int().min(1950, "Tahun minimal 1950.").max(2100);

export const vehicleModelSchema = z
  .object({
    makeId: z.uuid(),
    name,
    slug,
    yearStart: year,
    yearEnd: z
      .union([z.literal(""), z.null(), year])
      .optional()
      .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
    isActive: z.boolean(),
  })
  .refine((v) => v.yearEnd === null || v.yearEnd >= v.yearStart, {
    path: ["yearEnd"],
    message: "Tahun akhir tidak boleh sebelum tahun mulai.",
  });
export type VehicleModelValues = z.input<typeof vehicleModelSchema>;

export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });
