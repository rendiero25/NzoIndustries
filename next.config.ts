import path from "path";
import type { NextConfig } from "next";

import { buildContentSecurityPolicy } from "./src/lib/security/csp";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy(isDev) },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // geolocation=(self): location picker alamat (kurir on-demand).
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  serverExternalPackages: ["lightningcss"],
  // nzo.local → alias hosts-file ke localhost, supaya Cloudflare Turnstile bisa
  // di-whitelist (widget butuh domain valid, bukan "localhost" polos).
  allowedDevOrigins: ["nzo.local"],
  // Log dev Next 16 mencetak argumen server action (termasuk password/alamat).
  // Dimatikan sesuai security rule 13.
  logging: { serverFunctions: false },
  // Dev pakai `next dev --webpack` — Turbopack sering bentrok dengan lightningcss (Tailwind v4).
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "lightningcss"];
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/terms", destination: "/syarat-ketentuan", permanent: true },
      // Dashboard legacy GeekyTech diganti /account (Fase 7).
      { source: "/dashboard", destination: "/account", permanent: true },
      { source: "/dashboard/orders/:path*", destination: "/account/orders", permanent: true },
      { source: "/dashboard/profile", destination: "/account/profile", permanent: true },
      { source: "/dashboard/change-password", destination: "/account/profile", permanent: true },
      {
        source: "/dashboard/:section(addresses|wishlist|vouchers|notifications)",
        destination: "/account/:section",
        permanent: true,
      },
      { source: "/dashboard/:path*", destination: "/account", permanent: true },
      { source: "/wishlist", destination: "/account/wishlist", permanent: true },
      { source: "/privacy", destination: "/kebijakan-privasi", permanent: true },
      // Rute admin legacy GeekyTech (Fase 8C).
      { source: "/admin/coupons/:path*", destination: "/admin/vouchers", permanent: true },
      {
        source: "/admin/promotions/flash-sale/:path*",
        destination: "/admin/flash-sales",
        permanent: true,
      },
      { source: "/admin/promotions/:path*", destination: "/admin/banners", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google OAuth profile pictures
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Placeholder seed data — hapus setelah seed pindah ke Cloudinary (Fase 1/3)
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
