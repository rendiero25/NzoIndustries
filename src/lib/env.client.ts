import { z } from "zod";

/**
 * Env publik (NEXT_PUBLIC_*). Next.js menginline nilai ini saat build, jadi
 * setiap variabel harus dirujuk eksplisit (bukan lewat spread process.env).
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{8,15}$/)
    .optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cached: ClientEnv | undefined;

export function getClientEnv(): ClientEnv {
  if (cached) return cached;
  // `KEY=` (kosong) diperlakukan sama dengan tidak diset.
  const orUndefined = (value: string | undefined) => (value === "" ? undefined : value);
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: orUndefined(process.env.NEXT_PUBLIC_APP_URL),
    NEXT_PUBLIC_SUPABASE_URL: orUndefined(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: orUndefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: orUndefined(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: orUndefined(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    NEXT_PUBLIC_GA_MEASUREMENT_ID: orUndefined(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    NEXT_PUBLIC_META_PIXEL_ID: orUndefined(process.env.NEXT_PUBLIC_META_PIXEL_ID),
    NEXT_PUBLIC_WHATSAPP_NUMBER: orUndefined(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  });
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Env publik tidak valid: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}
