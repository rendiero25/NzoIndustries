import "server-only";

import { z } from "zod";

/**
 * Env server (secret). Divalidasi lazy saat pertama dipakai, bukan saat import,
 * supaya `next build` tidak gagal hanya karena integrasi yang belum dipakai.
 * Integrasi yang menunggu info klien (P-xx) sengaja optional.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CRON_SECRET: z.string().min(16).optional(),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.email().optional(),
  RESEND_FROM_NAME: z.string().min(1).optional(),
  RESEND_ADMIN_EMAIL: z.email().optional(),

  MAYAR_API_KEY: z.string().min(1).optional(),
  MAYAR_WEBHOOK_TOKEN: z.string().min(1).optional(),
  MAYAR_IS_PRODUCTION: z.enum(["true", "false"]).default("false"),

  BITESHIP_API_KEY: z.string().min(1).optional(),
  BITESHIP_IS_PRODUCTION: z.enum(["true", "false"]).default("false"),
  BITESHIP_ORIGIN_POSTAL_CODE: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),

  JUBELIO_BASE_URL: z.url().optional(),
  JUBELIO_EMAIL: z.string().min(1).optional(),
  JUBELIO_PASSWORD: z.string().min(1).optional(),

  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  // `KEY=` (kosong) di .env diperlakukan sama dengan tidak diset.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Hanya nama variabel yang dilaporkan, tidak pernah nilainya.
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Env server tidak valid: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}
