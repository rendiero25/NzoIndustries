import { z } from "zod";

/** Schema form produk admin (Fase 8A). Sama dengan constraint DB. */
const money = z.coerce
  .number()
  .int("Harus bilangan bulat.")
  .min(0, "Tidak boleh negatif.")
  .max(1_000_000_000);
const optionalMoney = z
  .union([z.literal(""), z.null(), money])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : v));
const optionalInt = (max: number) =>
  z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive().max(max)])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const productCoreSchema = z
  .object({
    name: z.string().trim().min(3, "Nama minimal 3 huruf.").max(200),
    slug: z.string().trim().regex(SLUG_RE, "Slug huruf kecil, angka, dan tanda minus."),
    sku: z.string().trim().regex(SKU_RE, "SKU huruf/angka, boleh . _ -, maks 64."),
    status: z.enum(["draft", "published", "archived"]),
    brandId: z.uuid().nullable(),
    categoryIds: z.array(z.uuid()).max(10),
    price: money,
    compareAtPrice: optionalMoney,
    shortDescription: optionalText(300),
    description: optionalText(20000),
    installationGuide: optionalText(20000),
    warrantyInfo: optionalText(1000),
    weightGrams: optionalInt(100000),
    lengthMm: optionalInt(5000),
    widthMm: optionalInt(5000),
    heightMm: optionalInt(5000),
    metaTitle: optionalText(70),
    metaDescription: optionalText(170),
    initialStock: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .refine((v) => v.compareAtPrice === null || v.compareAtPrice > v.price, {
    path: ["compareAtPrice"],
    message: "Harga coret harus lebih besar dari harga jual.",
  });
export type ProductCoreInput = z.input<typeof productCoreSchema>;
export type ProductCoreValues = z.output<typeof productCoreSchema>;

export const variantSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Isi nama varian.").max(100),
    sku: z.string().trim().regex(SKU_RE, "SKU varian tidak valid."),
    price: optionalMoney,
    compareAtPrice: optionalMoney,
    weightGrams: optionalInt(100000),
    isActive: z.boolean(),
    initialStock: z.coerce.number().int().min(0).max(100000).optional(),
  })
  .refine((v) => v.compareAtPrice === null || (v.price !== null && v.compareAtPrice > v.price), {
    path: ["compareAtPrice"],
    message: "Harga coret varian butuh harga varian yang lebih kecil.",
  });
export const variantsSchema = z.array(variantSchema).max(100);
export type VariantInput = z.input<typeof variantSchema>;

export const specsSchema = z
  .array(
    z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(300) }),
  )
  .max(60);

export const fitmentSchema = z
  .object({
    modelId: z.uuid(),
    yearStart: z.coerce.number().int().min(1950).max(2100).nullable(),
    yearEnd: z.coerce.number().int().min(1950).max(2100).nullable(),
    notes: optionalText(200),
  })
  .refine((v) => v.yearStart === null || v.yearEnd === null || v.yearEnd >= v.yearStart, {
    path: ["yearEnd"],
    message: "Tahun akhir harus ≥ tahun awal.",
  });

export const bulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["publish", "draft", "archive"]),
    ids: z.array(z.uuid()).min(1).max(500),
  }),
  z.object({
    action: z.literal("discount"),
    ids: z.array(z.uuid()).max(500),
    categoryId: z.uuid().nullable(),
    mode: z.enum(["percent", "amount", "clear"]),
    value: z.coerce.number().int().min(0).max(1_000_000_000),
  }),
  z.object({
    action: z.literal("brand"),
    ids: z.array(z.uuid()).min(1).max(500),
    brandId: z.uuid().nullable(),
  }),
  z.object({
    action: z.literal("category"),
    ids: z.array(z.uuid()).min(1).max(500),
    categoryId: z.uuid(),
  }),
]);
export type BulkActionInput = z.input<typeof bulkActionSchema>;
