import { z } from "zod";

export const PAYMENT_PROVIDERS = ["mayar", "manual_transfer"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export const voucherCodeSchema = z
  .string()
  .trim()
  .max(32)
  .regex(/^[A-Za-z0-9_-]*$/, "Kode voucher hanya huruf, angka, - dan _.");

/** `${courierCode}:${serviceCode}` dari ShippingRate.id */
export const rateIdSchema = z.string().regex(/^[a-z0-9_-]{1,40}:[a-z0-9_-]{1,60}$/i);

export const cartLineInputSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(999),
});
export const cartLinesInputSchema = z.array(cartLineInputSchema).max(100);
export type CartLineInput = z.infer<typeof cartLineInputSchema>;

export const quoteSchema = z.object({
  addressId: z.uuid().nullable(),
  rateId: rateIdSchema.nullable(),
  voucherCode: voucherCodeSchema.optional(),
});

export const placeOrderSchema = z.object({
  checkoutKey: z.uuid(),
  addressId: z.uuid({ message: "Pilih alamat pengiriman." }),
  rateId: rateIdSchema,
  voucherCode: voucherCodeSchema.optional(),
  paymentProvider: z.enum(PAYMENT_PROVIDERS, { message: "Pilih metode pembayaran." }),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional(),
  turnstileToken: z.string().max(4096).optional(),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const PAYMENT_LABELS: Record<PaymentProviderId, { title: string; description: string }> = {
  mayar: {
    title: "Pembayaran online",
    description: "QRIS, virtual account, e-wallet, atau kartu lewat Mayar.",
  },
  // Tidak dipakai sejak D-31 (Mayar saja); disimpan untuk change request.
  manual_transfer: {
    title: "Transfer bank",
    description: "Transfer manual ke rekening NZO, lalu unggah bukti transfer.",
  },
};
