import { z } from "zod";

/** Schema dashboard user (Fase 7); dipakai client & server. */
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Isi nama minimal 2 huruf.")
    .max(120, "Maksimal 120 karakter."),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(
      z.union([
        z.literal(""),
        z.string().regex(/^\+?[0-9]{8,15}$/, "Nomor HP 8–15 digit, contoh 081234567890."),
      ]),
    ),
});
export type ProfileInput = z.input<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Isi kata sandi saat ini."),
    newPassword: z
      .string()
      .min(8, "Minimal 8 karakter.")
      .max(72, "Maksimal 72 karakter.")
      .regex(/[A-Za-z]/, "Gabungkan huruf dan angka.")
      .regex(/[0-9]/, "Gabungkan huruf dan angka."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Kata sandi baru harus berbeda.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().email("Ketik email akunmu."),
});

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AFTER_SALES_TYPES = [...IMAGE_TYPES, "video/mp4"] as const;
export const REVIEW_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const AFTER_SALES_MAX_BYTES = 10 * 1024 * 1024;

export const uploadRequestSchema = z.object({
  bucket: z.enum(["review-images", "after-sales-media"]),
  contentType: z.string().max(40),
  size: z.number().int().positive(),
});

/** Path storage yang dibuat server: `{uid}/{uuid}.{ext}`. */
const storagePath = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4)$/);

export const reviewSchema = z.object({
  orderItemId: z.uuid(),
  rating: z.number().int().min(1, "Pilih rating.").max(5),
  comment: z.string().trim().max(2000, "Maksimal 2000 karakter.").optional(),
  imagePaths: z.array(storagePath).max(5, "Maksimal 5 foto."),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const RETURN_REASONS = [
  "Barang tidak sesuai pesanan",
  "Barang rusak saat diterima",
  "Tidak cocok dengan kendaraan",
  "Barang kurang / tidak lengkap",
  "Lainnya",
] as const;

export const returnSchema = z.object({
  orderNumber: z.string().regex(/^NZO-\d{6}-[0-9A-F]{6}$/),
  orderItemId: z.uuid().nullable(),
  reason: z.enum(RETURN_REASONS, { message: "Pilih alasan retur." }),
  description: z.string().trim().max(1000, "Maksimal 1000 karakter.").optional(),
  mediaPaths: z.array(storagePath).max(6, "Maksimal 6 file."),
});
export type ReturnInput = z.infer<typeof returnSchema>;

export const claimSchema = z.object({
  orderItemId: z.uuid(),
  description: z
    .string()
    .trim()
    .min(10, "Jelaskan masalahnya minimal 10 karakter.")
    .max(2000, "Maksimal 2000 karakter."),
  mediaPaths: z.array(storagePath).max(6, "Maksimal 6 file."),
});
export type ClaimInput = z.infer<typeof claimSchema>;
