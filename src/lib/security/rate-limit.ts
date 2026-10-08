import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getServerEnv } from "@/lib/env";

/**
 * Rate limit (security rule 6). Upstash Redis bila env tersedia; tanpa env
 * dipakai fallback in-memory per instance (cukup untuk dev, lemah di
 * serverless). Upstash wajib diisi sebelum launch (Fase 12).
 */
export type RateLimitRule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  checkout: { limit: 5, windowSeconds: 60 },
  shippingRates: { limit: 20, windowSeconds: 60 },
  voucher: { limit: 10, windowSeconds: 60 },
  address: { limit: 20, windowSeconds: 60 },
  paymentStatus: { limit: 12, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

const limiters = new Map<RateLimitName, Ratelimit>();
const memory = new Map<string, { count: number; resetAt: number }>();
let warned = false;

function upstashLimiter(name: RateLimitName): Ratelimit | null {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    const rule = RATE_LIMITS[name];
    limiter = new Ratelimit({
      redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
      prefix: `nzo:rl:${name}`,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

function memoryLimit(name: RateLimitName, key: string): boolean {
  const rule = RATE_LIMITS[name];
  const now = Date.now();
  const id = `${name}:${key}`;
  const entry = memory.get(id);
  if (!entry || entry.resetAt <= now) {
    memory.set(id, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= rule.limit;
}

/** true = boleh lanjut. `key` biasanya user id (aksi login) atau IP. */
export async function checkRateLimit(name: RateLimitName, key: string): Promise<boolean> {
  const limiter = upstashLimiter(name);
  if (!limiter) {
    if (!warned && getServerEnv().NODE_ENV === "production") {
      warned = true;
      console.warn("[rate-limit] Upstash belum dikonfigurasi, memakai fallback in-memory.");
    }
    return memoryLimit(name, key);
  }
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    // Redis bermasalah: jangan blokir pembeli, tetap batasi per instance.
    return memoryLimit(name, key);
  }
}
