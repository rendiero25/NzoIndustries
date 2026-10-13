import { z } from "zod";

/** Schema aksi pelanggan & after-sales admin (Fase 8D). */

export const CUSTOMER_SEGMENTS = ["new", "active", "inactive", "top", "blocked"] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const RETURN_TRANSITIONS: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved: ["item_shipped", "item_received", "refunded", "rejected"],
  item_shipped: ["item_received"],
  item_received: ["refunded", "completed"],
  refunded: ["completed"],
};

export const CLAIM_TRANSITIONS: Record<string, string[]> = {
  submitted: ["in_review", "approved", "rejected"],
  in_review: ["approved", "rejected"],
  approved: ["resolved"],
};

/** Status akhir yang wajib menyertakan resolusi untuk pelanggan (sama dengan RPC). */
export const NEEDS_RESOLUTION = new Set(["rejected", "refunded", "completed", "resolved"]);

const optionalNote = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v ? v : null));

export const afterSalesStatusSchema = z
  .object({
    kind: z.enum(["return", "claim"]),
    id: z.uuid(),
    status: z.string().min(1),
    note: optionalNote(1000),
    resolution: optionalNote(1000),
  })
  .refine((v) => !NEEDS_RESOLUTION.has(v.status) || !!v.resolution, {
    path: ["resolution"],
    message: "Tulis resolusi untuk pelanggan.",
  });
export type AfterSalesStatusInput = z.input<typeof afterSalesStatusSchema>;

export const reviewModerationSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "published", "hidden"]),
  reply: optionalNote(1000),
});
export type ReviewModerationInput = z.input<typeof reviewModerationSchema>;
