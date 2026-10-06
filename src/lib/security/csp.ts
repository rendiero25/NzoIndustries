/**
 * Content-Security-Policy statis. Dipakai di next.config.ts (headers()).
 *
 * script-src masih butuh 'unsafe-inline' karena Next.js menyisipkan inline script
 * untuk hydration. Nonce-based CSP (tanpa 'unsafe-inline') dijadwalkan di Fase 12
 * karena memaksa semua halaman dirender dinamis.
 *
 * Tambah domain baru di sini, bukan langsung di next.config.ts.
 */
type Directives = Record<string, string[]>;

export function buildContentSecurityPolicy(isDev: boolean): string {
  const directives: Directives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://challenges.cloudflare.com",
      "https://upload-widget.cloudinary.com",
      "https://widget.cloudinary.com",
      "https://www.googletagmanager.com",
      "https://connect.facebook.net",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://res.cloudinary.com",
      "https://*.supabase.co",
      "https://lh3.googleusercontent.com",
      "https://placehold.co",
      "https://www.facebook.com",
      "https://www.google-analytics.com",
      "https://*.tile.openstreetmap.org",
      "https://unpkg.com",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.cloudinary.com",
      "https://www.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.google-analytics.com",
      "https://www.facebook.com",
      "https://challenges.cloudflare.com",
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    "frame-src": [
      "https://challenges.cloudflare.com",
      "https://upload-widget.cloudinary.com",
      "https://widget.cloudinary.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");

  return policy.join("; ");
}
