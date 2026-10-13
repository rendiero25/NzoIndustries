import { z } from "zod";

/** Schema form promo & konten admin (Fase 8C). Sama dengan constraint DB. */

const money = z.coerce
  .number()
  .int("Harus bilangan bulat.")
  .min(0, "Tidak boleh negatif.")
  .max(1_000_000_000);
const blankToNull = <T extends z.ZodType>(schema: T) =>
  z
    .union([z.literal(""), z.null(), schema])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : (v as z.output<T>)));
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * `datetime-local` (waktu Jakarta) ke ISO UTC. Kosong = null. ISO yang sudah
 * ditransformasi (hasil resolver di client, dikirim ke server action) juga diterima.
 */
export const wibDateTime = z
  .union([
    z.literal(""),
    z.null(),
    z.string().regex(LOCAL_DT, "Format tanggal tidak valid."),
    z.iso.datetime({ offset: true }),
  ])
  .optional()
  .transform((v) => {
    if (!v) return null;
    return LOCAL_DT.test(v) ? new Date(`${v}:00+07:00`).toISOString() : new Date(v).toISOString();
  });

/** ISO UTC ke nilai `datetime-local` waktu Jakarta (untuk default form). */
export function toWibInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

const periodOk = (v: { startsAt: string | null; endsAt: string | null }) =>
  !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt);
const periodIssue = { path: ["endsAt"], message: "Waktu selesai harus setelah waktu mulai." };

// ---------------------------------------------------------------- voucher

export const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,32}$/, "Kode 3–32 huruf/angka, boleh _ dan -.")
      .transform((v) => v.toUpperCase()),
    description: optionalText(300),
    discountType: z.enum(["percent", "fixed"]),
    discountValue: z.coerce
      .number()
      .int()
      .positive("Nilai diskon harus lebih dari 0.")
      .max(1_000_000_000),
    maxDiscount: blankToNull(z.coerce.number().int().positive().max(1_000_000_000)),
    minSubtotal: money,
    usageLimit: blankToNull(z.coerce.number().int().positive().max(1_000_000)),
    perUserLimit: z.coerce.number().int().positive("Minimal 1.").max(1000),
    startsAt: wibDateTime,
    endsAt: wibDateTime,
    isActive: z.boolean(),
    isPublic: z.boolean(),
  })
  .refine((v) => v.discountType !== "percent" || v.discountValue <= 100, {
    path: ["discountValue"],
    message: "Persen maksimal 100.",
  })
  .refine(periodOk, periodIssue);
export type VoucherValues = z.input<typeof voucherSchema>;

// ---------------------------------------------------------------- flash sale

export const flashSaleSchema = z
  .object({
    name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(120),
    subtitle: optionalText(200),
    startsAt: wibDateTime.refine((v) => v !== null, "Waktu mulai wajib diisi."),
    endsAt: wibDateTime.refine((v) => v !== null, "Waktu selesai wajib diisi."),
    isActive: z.boolean(),
  })
  .refine(periodOk, periodIssue);
export type FlashSaleValues = z.input<typeof flashSaleSchema>;

export const flashSaleItemSchema = z.object({
  flashSaleId: z.uuid(),
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  salePrice: money,
  quota: blankToNull(z.coerce.number().int().positive().max(100000)),
});
export type FlashSaleItemValues = z.input<typeof flashSaleItemSchema>;

// ---------------------------------------------------------------- banner

export const BANNER_PLACEMENTS = ["hero", "promo", "promo_bar", "category"] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

const nzoPublicId = blankToNull(
  z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => v.startsWith("nzo/banners/") && !v.includes(".."),
      "Gambar harus dari folder banner.",
    ),
);

export const bannerSchema = z
  .object({
    placement: z.enum(BANNER_PLACEMENTS),
    title: optionalText(160),
    subtitle: optionalText(300),
    imagePublicId: nzoPublicId,
    mobileImagePublicId: nzoPublicId,
    linkUrl: blankToNull(
      z
        .string()
        .trim()
        .max(500)
        .refine((v) => /^(\/(?!\/)|https:\/\/)/.test(v), "Link harus diawali / atau https://."),
    ),
    startsAt: wibDateTime,
    endsAt: wibDateTime,
    isActive: z.boolean(),
  })
  .refine((v) => v.placement === "promo_bar" || v.imagePublicId !== null, {
    path: ["imagePublicId"],
    message: "Unggah gambar banner.",
  })
  .refine((v) => v.placement !== "promo_bar" || (v.title?.length ?? 0) > 0, {
    path: ["title"],
    message: "Bar promo butuh teks.",
  })
  .refine(periodOk, periodIssue);
export type BannerValues = z.input<typeof bannerSchema>;

// ---------------------------------------------------------------- halaman statis (D-39)

export const CONTENT_PAGE_SLUGS = [
  "about",
  "faq",
  "how-to-buy",
  "contact",
  "privacy",
  "terms",
  "returns-policy",
] as const;
export type ContentPageSlug = (typeof CONTENT_PAGE_SLUGS)[number];

export const contentPageSchema = z
  .object({
    title: z.string().trim().min(2, "Judul minimal 2 huruf.").max(120),
    body: z.string().max(50000, "Isi terlalu panjang (maks 50.000 karakter)."),
    metaDescription: optionalText(170),
    isPublished: z.boolean(),
  })
  .refine((v) => !v.isPublished || v.body.trim().length > 0, {
    path: ["body"],
    message: "Isi tidak boleh kosong saat ditayangkan.",
  });
export type ContentPageValues = z.input<typeof contentPageSchema>;
