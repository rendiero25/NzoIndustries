import { z } from "zod";

/** Alamat pengiriman (dipakai checkout dan `/account`). Sama dengan constraint DB. */
export const addressSchema = z.object({
  label: z.string().trim().max(40, "Maksimal 40 karakter.").optional().or(z.literal("")),
  recipient: z.string().trim().min(2, "Isi nama penerima.").max(120, "Maksimal 120 karakter."),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "Nomor HP 8–15 digit, contoh 081234567890.")),
  areaId: z.string().trim().min(1, "Pilih kecamatan dari daftar.").max(120),
  province: z.string().trim().min(1, "Pilih kecamatan dari daftar.").max(80),
  city: z.string().trim().min(1, "Pilih kecamatan dari daftar.").max(80),
  district: z.string().trim().min(1, "Pilih kecamatan dari daftar.").max(80),
  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9]{5}$/, "Kode pos 5 digit."),
  fullAddress: z
    .string()
    .trim()
    .min(10, "Tulis alamat lengkap (jalan, nomor, RT/RW).")
    .max(300, "Maksimal 300 karakter."),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.input<typeof addressSchema>;
export type AddressValues = z.output<typeof addressSchema>;
