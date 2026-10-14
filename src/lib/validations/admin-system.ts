import { z } from "zod";

/** Schema administrasi admin (Fase 8E): laporan, staf, pengaturan toko. */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const reportRangeSchema = z
  .object({
    from: z.string().regex(DATE, "Tanggal tidak valid."),
    to: z.string().regex(DATE, "Tanggal tidak valid."),
    group: z.enum(["day", "month"]).default("day"),
  })
  .refine((v) => v.to >= v.from, { path: ["to"], message: "Tanggal akhir sebelum tanggal awal." })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= 366, {
    path: ["to"],
    message: "Periode maksimal 1 tahun.",
  });
export type ReportRange = z.output<typeof reportRangeSchema>;

/** Tanggal hari ini di Asia/Jakarta (YYYY-MM-DD). */
export function wibToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const STAFF_ROLES = ["owner", "admin", "warehouse", "cs"] as const;

export const setRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum([...STAFF_ROLES, "customer"]),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2, "Nama toko minimal 2 huruf.").max(80),
  supportEmail: z
    .union([z.literal(""), z.null(), z.email("Email tidak valid.")])
    .optional()
    .transform((v) => (v ? v : null)),
  supportWhatsapp: z
    .union([
      z.literal(""),
      z.null(),
      z
        .string()
        .trim()
        .regex(/^(\+?62|0)8\d{7,12}$/, "Nomor WhatsApp tidak valid."),
    ])
    .optional()
    .transform((v) => (v ? v : null)),
  mayarEnabled: z.boolean(),
  paymentTimeoutMinutes: z.coerce
    .number()
    .int()
    .min(15, "Minimal 15 menit.")
    .max(2880, "Maksimal 48 jam."),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  returnWindowDays: z.coerce.number().int().min(0).max(60),
  requireStaffMfa: z.boolean(),
  shipper: z.object({
    name: optionalText(80),
    phone: z
      .union([
        z.literal(""),
        z.null(),
        z
          .string()
          .trim()
          .regex(/^(\+?62|0)\d{8,13}$/, "Nomor telepon tidak valid."),
      ])
      .optional()
      .transform((v) => (v ? v : null)),
    address: optionalText(300),
    postalCode: z
      .union([
        z.literal(""),
        z.null(),
        z
          .string()
          .trim()
          .regex(/^\d{5}$/, "Kode pos 5 angka."),
      ])
      .optional()
      .transform((v) => (v ? v : null)),
    areaId: optionalText(80),
  }),
});
export type StoreSettingsValues = z.input<typeof storeSettingsSchema>;
