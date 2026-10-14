# task.md — NZO Industries E-commerce

Versi dokumen: 0.18 (2026-10-14). Aturan, keputusan (`D-xx`), dan pending klien (`P-xx`) ada di `CLAUDE.md`. Aturan visual ada di `design-system.md`.

**Legenda:** `[ ]` belum, `[x]` selesai, `[P-xx]` bergantung pada info klien (kerjakan dengan stub/feature flag, jangan menebak).

**Definition of done tiap fase:** `lint` + `typecheck` + `build` lolos, RLS tabel baru teruji, UI sesuai design-system.md (mobile dan desktop), catatan fase diisi.

---

## Fase 0 — Setup dan fondasi
- [x] Fork starter GeekyTech, buang modul yang tidak relevan, rename ke `nzo-industries` (D-01, D-15)
- [x] Repo GitHub dengan dua branch: `development` → preview, `main` → production — `github.com/rendiero25/NzoIndustries`, kedua branch ter-push (D-16)
- [x] Buat project Supabase dan project Vercel — Supabase ✓ (region `ap-southeast-2`, D-17). Vercel ✓ `nzo-industries.vercel.app`, branch `development` (D-21); region function `syd1` dikunci di `vercel.json`. Paket produksi tetap [P-03]
- [x] Buat akun/environment Cloudinary dan Resend (D-13) — Resend: akun dibuat user. Cloudinary: akun user yang sudah ada, aset NZO dikunci di root `nzo/` (D-16, `src/lib/cloudinary/folders.ts` + test). Kunci API diisi user di `.env.local`; domain Resend menunggu P-09
- [x] `env.example` lengkap: Supabase, Cloudinary, Resend, Mayar, Biteship, Jubelio, Upstash, Turnstile, GA4, Meta Pixel
- [x] TypeScript strict, ESLint, Prettier, Husky + lint-staged
- [x] Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) di `next.config`
- [x] `import 'server-only'` di semua modul yang memakai secret
- [x] Endpoint `/api/health` dan monitoring error (Vercel Logs atau Sentry) — Vercel Logs; Sentry opsional setelah P-03

**Catatan fase:**
- Fork (D-15): source disalin tanpa history git, dipindah ke `src/` (alias `@/*` → `./src/*`). 37 migration GeekyTech diarsip di `supabase/_reference/geekytech-migrations/` (acuan saja); `supabase/migrations/` kosong untuk Fase 1.
- Dibuang: `components/chat`, script dark mode, workflow deploy VPS, docs/tooling GeekyTech, aset demo. Modul complaint, geo/leaflet on-demand, coupons, featured/second products **tetap**; dievaluasi di Fase 5/7/8.
- Rebrand: string "GeekyTech" → "NZO Industries" (109 file), `src/lib/constants/site.ts`, metadata root untuk otomotif. Placeholder yang menunggu klien: `public/logo.svg` (wordmark), panel foto auth dikosongkan, alamat/sosmed footer `#` [P-11], `LEGAL_ENTITY_NAME` [P-07], domain `nzo-industries.test` di copy/email [P-09]. Halaman syarat-ketentuan, kebijakan-privasi, kebijakan-pengembalian diganti stub `noindex` [P-08] (teks lama milik entitas lain). Halaman about/FAQ masih berisi copy gadget GeekyTech → tulis ulang di Fase 4.
- Token/warna/font GeekyTech (`geeky-*`, `#EA5329`, Plus Jakarta Sans) belum diganti → Fase 2.
- pnpm 11: lockfile dari `pnpm import` (versi sama dengan starter). `@radix-ui/react-label` di `ui/form.tsx` diganti import dari `radix-ui` (sebelumnya ikut hoisting npm).
- TS: tambah `noImplicitOverride`, `noFallthroughCasesInSwitch`, target ES2022. `noUncheckedIndexedAccess` belum diaktifkan (kode starter banyak index access) → Fase 12.
- ESLint: `no-explicit-any` error, `alert/confirm/prompt` dilarang (D-10). 7 `confirm()` diganti hook `useConfirm()` (`src/hooks/use-confirm.tsx`, berbasis `ConfirmDialog`); 3 `any` dihapus. 18 pelanggaran `react-hooks/*` (set-state-in-effect, purity, immutability, error-boundaries) warisan starter diturunkan ke `warn` sementara → kembalikan ke `error` di Fase 12 atau saat komponen dirombak. Hasil: 0 error, 46 warning.
- CSP statis di `src/lib/security/csp.ts` masih `'unsafe-inline'` untuk script (Next.js inline script). Nonce-based CSP → Fase 12.
- `/api/health`: publik hanya `status/time/commit`; cek DB hanya dengan `Authorization: Bearer $CRON_SECRET`.
- `env.ts` / `env.client.ts` (Zod, lazy) tersedia; modul lama masih baca `process.env` langsung, dipindah bertahap.
- `proxy.ts` masih cek role `admin` saja; RBAC 5 role + guard di DAL → Fase 1.
- Verifikasi: `pnpm typecheck` ✓, `pnpm lint` ✓ (0 error), `pnpm test` ✓ (2/2), `pnpm build` ✓ dengan `.env.local` dummy, `/api/health` 200 + semua security header ✓, `/login` tanpa pelanggaran CSP ✓. Halaman yang query Supabase belum bisa diuji tanpa project.

## Fase 1 — Database, auth, dan role
- [x] Migration tabel inti (16 file di `supabase/migrations/`, 39 tabel):
  - Pengguna: `profiles` (role: owner, admin, warehouse, cs, customer), `addresses`
  - Kendaraan: `vehicle_makes`, `vehicle_models` (tipe motor/mobil, `year_start`, `year_end`), `user_vehicles` (Garasi)
  - Katalog: `categories` (parent_id), `brands`, `products`, `product_variants`, `product_categories`, `product_images` (Cloudinary `public_id`), `product_fitments`, `product_specs`
  - Stok: `inventory_movements` (ledger), `stock_reservations`
  - Belanja: `carts`, `cart_items`, `wishlists`
  - Promo: `vouchers`, `voucher_redemptions`, `flash_sales`, `flash_sale_items`, `banners`
  - Pesanan: `orders`, `order_items`, `order_status_history`, `payments`, `payment_proofs`, `shipments`
  - Purna jual: `returns`, `warranty_claims`, `reviews`
  - Sistem: `notifications`, `audit_logs`, `webhook_events`, `store_settings`
  - Import: `import_batches`, `import_products` (staging), `import_logs`
- [x] Kolom produk: nama, slug, SKU unik, harga (`bigint`), `compare_at_price`, stok, status draft/published/archived wajib; field lain nullable (D-05). Kolom `jubelio_item_id` (D-12). Harga varian opsional (D-18)
- [x] Dimensi dan berat produk untuk ongkir volumetrik (`weight_grams`, `length_mm/width_mm/height_mm`)
- [x] RLS + policy untuk setiap tabel, termasuk test policy per role (`pnpm test:rls`, 15 kasus)
- [x] Index untuk slug, SKU, status, kategori, fitment, pencarian (full-text / trigram)
- [x] Trigger: `updated_at`, snapshot `order_status_history`, audit log
- [ ] Supabase Auth: email + password, verifikasi email, reset password, SMTP via Resend [P-09] — daftar, verifikasi, login sudah diuji user ✓; reset password untuk akun ber-TOTP kini minta kode dulu (bug "AAL2 session is required…" diperbaiki). **Menunggu**: SMTP Resend setelah domain (P-09)
- [x] MFA (TOTP) untuk role staf — di RLS (aal2) dan guard server, diuji end-to-end. D-20: diwajibkan lewat flag `store_settings.require_staff_mfa`, default **mati** (login staf tanpa QR); test RLS mencakup kedua mode
- [x] Helper auth: `requireUser()`, `requireRole([...])`, `requireStaff()`, `checkRole()` di `src/lib/auth/guards.ts`
- [x] `supabase gen types` dan seed data contoh (kategori, merek/model kendaraan, produk dummy)

**Catatan fase:**
- Schema ditulis ulang dari nol (D-15); 16 migration diterapkan ke project dev lewat CLI tanpa Docker (D-19). 39 tabel, semua RLS aktif. `webhook_events` sengaja tanpa policy (service role saja).
- RBAC: helper policy di schema `private` (tidak bisa dipanggil via `/rest/v1/rpc`). Staf wajib aal2 di level RLS, bukan hanya UI. Role user hanya berubah lewat RPC `set_user_role` (owner + MFA, owner terakhir tidak bisa diturunkan); kolom profil yang boleh diubah user dibatasi column privilege.
- Stok: `inventory_movements` append-only (trigger menolak update/delete, termasuk service role); cache `stock` hanya ditulis trigger internal (flag `nzo.cache_write`). Produk bervarian wajib `variant_id`.
- Audit: trigger generik di 25 tabel admin, hanya aksi staf/sistem; alamat lengkap & catatan pelanggan tidak ikut disimpan. Kolom pelaku (`actor_id`, `created_by`, `changed_by`) sengaja tanpa FK agar user bisa dihapus (UU PDP) tanpa merusak jejak (migration 16, ditemukan saat teardown test).
- Kode legacy (D-19): 167 file starter memakai `@/lib/supabase/legacy/*` + `@/types/legacy-supabase`. Halaman storefront/dashboard/admin lama akan error runtime karena tabel/kolom berubah, sampai ditulis ulang di Fase 3–8.
- Auth: route `/api/auth/{register,admin-login,resend-activation}` diganti server action (`src/server/actions/auth.ts`); daftar anti-enumerasi; tombol Google OAuth dihapus (di luar scope). Ditemukan & diperbaiki: open redirect via `redirectTo=//domain` di login dan `/auth/callback` (`safeRedirectPath`), callback tidak lagi memantulkan teks error dari URL.
- Ditemukan & diperbaiki: `AuthProvider` starter melakukan `await` query di dalam `onAuthStateChange` sehingga lock auth Supabase macet (semua panggilan auth di tab berhenti, termasuk MFA). Kini kerja async dijadwalkan di luar callback, dan client browser legacy memakai instance yang sama dengan client baru.
- Advisors: tersisa 2 WARN yang disengaja (`set_user_role`, `set_user_blocked` bisa dipanggil authenticated; otorisasi di dalam fungsi). WARN `multiple_permissive_policies` (performa) ditunda ke Fase 12; INFO unused index wajar untuk DB baru.
- `.env.local`: nilai placeholder dikosongkan (Turnstile placeholder membuat login gagal). `getServerEnv/getClientEnv` menganggap `KEY=` sebagai tidak diset.
- Tooling: Supabase CLI + tsx sebagai dev dependency. shadcn CLI gagal karena Node menolak sertifikat registry; `InputOTP` dipasang manual dari registry JSON (perlu dicek ulang saat shadcn CLI bisa dipakai).
- Belum: uji alur email pelanggan (butuh inbox user; SMTP bawaan Supabase hanya mengirim ke email anggota tim project, rate rendah), Resend SMTP [P-09], rate limit Upstash (Fase 5/12), captcha Turnstile di Supabase (menunggu key). Console dev masih ada warning React "duplicate key" dari komponen starter.
- Verifikasi: `pnpm typecheck` ✓, `pnpm lint` ✓ (0 error), `pnpm test` ✓ (18), `pnpm test:rls` ✓ (15, teardown bersih), `pnpm build` ✓, redirect/guard 9/9 ✓, login staf → enroll TOTP → `/admin` ✓ di browser.

## Fase 2 — Implementasi design system
- [x] Token warna, radius, dan tipografi di `globals.css` sesuai design-system.md §2–4 (D-02)
- [x] Font Outfit via `next/font/google`
- [x] Install komponen shadcn yang tercantum di design-system.md §7 (D-03)
- [x] Install Magic UI terbatas: Marquee, NumberTicker, BlurFade
- [x] Setup GSAP + ScrollTrigger + hook `useReducedMotion` (D-11)
- [x] Sonner di root layout dengan konfigurasi posisi/durasi §9 (D-10) — durasi error 6 detik belum per-tipe (Sonner global 4 detik), dikerjakan saat helper notifikasi dibuat
- [x] Komponen dasar: `Price`, `ProductCard`, `FitmentBadge` (motif perisai), `EmptyState`, `PageHeader`, skeleton set
- [x] Halaman `/design` (dev only) untuk preview token dan komponen
- [x] Tambahan (permintaan user): redesign shell agar tidak lagi seperti GeekyTech — header, promo bar, footer, tombol WhatsApp, 404, halaman auth, login admin, MFA, shell admin, shell akun
- [x] Logo resmi NZO (D-25) — diterima 2026-10-06, dipasang di Fase 3

**Catatan fase:**
- Arah visual mengikuti design-system.md (user memilih tidak mengusulkan arah baru). Skill frontend-design + impeccable dipakai untuk eksekusi; Outfit dan hitam murni dipertahankan karena identitas brand sudah dikunci dokumen.
- Palet GeekyTech dihapus: `scripts/codemod-geekytech-palette.mjs` mengganti 1.461 kelas/literal di 208 file (oranye `#EA5329`, abu ala Apple, tracking -0.374px). Kelas lama `swiss-*`/`admin-utility*` didefinisikan ulang ke token NZO. Favicon, logo PNG/SVG, dan gambar WhatsApp GeekyTech dihapus.
- Nomor WhatsApp GeekyTech yang masih hardcode diganti `NEXT_PUBLIC_WHATSAPP_NUMBER`; tombol dan link CS tidak tampil bila env kosong.
- Bottom nav mobile ala GeekyTech dilepas (design-system: menu mobile lewat Sheet). Promo bar membaca `banners` placement `promo_bar` (schema NZO).
- Panel admin: menu disaring per role (owner/admin/warehouse/cs), badge hitungan legacy dan lonceng notifikasi legacy dilepas sampai Fase 8. Dark mode khusus admin (kelas `dark` di `<html>` hanya selama di admin).
- Akun: shell tanpa sidebar shadcn (navigasi kiri desktop, tab geser mobile). Path tetap `/dashboard` sampai Fase 7.
- Token `success` digelapkan ke `#1C7F46` (kontras teks putih 4.38 menjadi 5.03:1).
- Judul halaman legacy yang dobel ("… — NZO Industries | NZO Industries") dirapikan di 48 file.
- shadcn CLI: gagal TLS karena Node 24.6 tidak membangun rantai Let's Encrypt baru (`YR1`). Solusi sementara: `NODE_EXTRA_CA_CERTS` berisi intermediate LE (scratchpad). Registry `radix-nova` mengirim sumber mentah (`import { cn } from "cn"`, `IconPlaceholder`); ditransformasi manual dan paket npm `cn` yang ikut terpasang dihapus (bukan util kita).
- `@tanstack/react-table` dipin ke v8 (pola Data Table shadcn).
- Isi halaman storefront/akun/admin masih legacy (data schema GeekyTech) sampai Fase 4/7/8; tampilannya sudah memakai token NZO.
- Verifikasi: `typecheck` ✓, `lint` ✓ (0 error), `test` ✓ (21), `build` ✓; cek visual desktop + mobile 375 (`/design`, `/`, `/products`, `/login`, `/admin/login`, `/admin` dengan akun staf sementara, mode gelap admin). Akun test dihapus setelahnya.

## Fase 3 — Katalog, gambar, dan import produk
- [x] Integrasi Cloudinary: route signature `/api/cloudinary/sign` (owner/admin), `CldImage`, folder sesuai design-system.md §11 — uploader di `/admin/products/[id]/images`. **Belum diuji dengan kunci asli**: env Cloudinary di `.env.local` masih kosong
- [x] Import CSV/Excel (fallback dan untuk update massal): upload → staging → preview → commit sebagai draft — `/admin/import` (export Jubelio atau template NZO)
- [x] Import awal dari export "Daftar Harga" Jubelio (D-24): `pnpm import:export` — 13.515 produk + 5.794 varian masuk dev sebagai `draft`, stok 0
- [ ] Script `scripts/import-jubelio.ts` (API) [P-04] — kerangka + mapping siap, menunggu akses API:
  - [ ] Login token dan ambil produk + varian dengan pagination (endpoint masih asumsi, verifikasi di docs.jubelio.com)
  - [x] Mapping field Jubelio ke schema, rapikan nama/SKU (D-06, D-23), harga = Harga Default (D-22)
  - [ ] Unduh foto lalu upload ke Cloudinary
  - [x] Tulis ke `import_products`, mode `--dry-run`, upsert by SKU (idempotent)
  - [x] Log hasil: berhasil, gagal, dilewati + alasan (`import_logs` + laporan `scripts/out/`)
  - [x] Commit ke `products` sebagai `draft` (RPC `import_commit_batch`)
- [ ] Stok, foto, dan berat produk nyata — menunggu export lain (Daftar Barang/Stok) atau API [P-04]
- [x] Kategori untuk produk non-otomotif (D-07) — `Non-otomotif` › Perawatan & kebersihan / Peralatan / Lainnya
- [x] Data merek/model/tahun kendaraan awal — 10 merek, 130 model (tahun perkiraan)

**Catatan fase:**
- Export Jubelio: 13.517 produk / 17.706 SKU. 2 baris gagal (SKU "." dan "-"). 1.028 SKU dinormalisasi (D-23), tidak ada tabrakan. Isi export hanya nama, SKU, varian, harga; tidak ada foto/stok/berat/kategori/brand.
- Hasil saran otomatis: brand 9.367 produk (85 brand, mayoritas genuine parts YGP/HGP/KGP/SGP), saran fitment 11.401 produk (disimpan di staging saja), kategori 370 produk masih `belum-dikategorikan` (kategori internal, tidak tampil publik). Kategori/nama tetap perlu dicek admin sebelum publish.
- Pohon kategori dan model kendaraan bersumber di `src/lib/import/{categories,vehicles}.ts`; migration `20261006000200` di-generate dari sana (ubah TS lalu buat migration baru).
- Ditemukan & diperbaiki: trigger `guard_product_cache_columns` gagal untuk setiap UPDATE `product_variants` (membaca `new.average_rating`), bug sejak Fase 1. Migration `20261006000300` + test regresi di `test:rls`.
- Shell admin: `SidebarInset` diberi `min-w-0` supaya tabel lebar tidak membuat scroll horizontal di seluruh halaman.
- Produk `DEMO-*` tetap published di dev karena dipakai fixture `test:rls`; storefront legacy masih menampilkan demo sampai Fase 4.
- Logo resmi (D-25) dipasang; favicon perisai.
- Verifikasi: `typecheck` ✓, `lint` ✓ (0 error), `test` ✓ (37), `test:rls` ✓ (20), `build` ✓; browser: logo navbar/footer/auth (desktop + 375), `/admin/import` upload CSV → preview → commit → riwayat (akun admin uji sementara, sudah dihapus), endpoint sign: anon 401.

## Fase 4 — Storefront
- [x] Layout: header, bar promo, navigasi, footer, tombol WhatsApp mengambang — header: menu Kategori (NavigationMenu dari DB), chip Garasi, saran pencarian NZO, badge keranjang
- [x] Beranda sesuai urutan section design-system.md §5 (hero + pemilih kendaraan, chip kategori, banner, flash sale, terlaris/terbaru, brand, statistik, ulasan) — section tanpa data tidak dirender; artikel pemasangan (opsional) dilewati
- [x] Animasi hero (GSAP timeline) dan micro-interaction §8 — terbang ke keranjang, badge memantul, hati pop, harga crossfade, countdown flip, NumberTicker; semua mati saat reduced motion
- [x] Halaman kategori, brand, promo, dan pencarian dengan filter (kendaraan, kategori, brand, harga, rating, stok) dan urutan
- [x] Pemilih kendaraan global: tersimpan di cookie untuk guest, di Garasi untuk user login
- [x] Detail produk: galeri, varian, cek kecocokan, tabs (deskripsi, spesifikasi, kecocokan, cara pasang, ulasan), produk terkait, sticky buy bar mobile
- [x] Wishlist
- [x] Halaman statis: tentang, kontak, FAQ, cara belanja [P-08] — data toko (alamat, jam, email CS) placeholder sampai P-09/P-11

**Catatan fase:**
- D-26: produk import dipublish di DB dev (13.528 published). D-27: 22.042 fitment saran (`is_verified = false`) dari import untuk 11.401 produk; badge perisai hanya untuk fitment terverifikasi (saat ini hanya produk DEMO).
- RPC `catalog_search`/`catalog_facets` + `private.catalog_filter`. Performa (warm, 13,5 rb produk): tanpa filter ±130 ms, kendaraan ±7 ms, pencarian ±5–120 ms, kategori ±90 ms, facet ±150 ms. Pelajaran: fungsi SQL non-inline dengan CTE kecil bisa ±500 ms karena plan generik (CTE di-inline lalu dijalankan per baris); solusinya plpgsql + `MATERIALIZED`. RLS tabel anak yang memanggil `is_product_visible()` per baris juga mahal → filter dijadikan security definer dengan batas `published` eksplisit.
- Keranjang guest (Zustand persist `nzo-cart`, versi 1, data legacy diabaikan): validasi server sebelum tambah (published, varian, stok). Halaman `/cart` & checkout masih legacy sampai Fase 5.
- Dihapus: komponen & data storefront legacy (beranda, PLP, PDP, promo/flash-sale lama, FAQ/kontak lama) dan endpoint `/api/contact` (mengirim email tanpa rate limit; form kontak menunggu Resend P-09 + rate limit). Yang masih dipakai halaman legacy dibiarkan: `home-product-tile`, `home-storefront`, `product-detail-page`, `store-header-server`, `products/_actions`.
- Header dipakai seragam lewat `StoreHeaderServer` (layout publik, 404, dashboard). Header tidak mengecil saat scroll (hanya bayangan) supaya konten tidak melompat.
- Bug ditemukan & diperbaiki: separator breadcrumb bersarang di `<li>` (hydration error); relasi self-join kategori di embed bertingkat tidak didukung PostgREST (induk kategori diambil dari pohon yang di-cache); `loading.tsx` membuat `notFound()` berstatus 200.
- Verifikasi: `typecheck` ✓, `lint` ✓ (0 error, 40 warning legacy), `test` ✓ (41), `test:rls` ✓ (22), `build` ✓; browser: beranda (hero + animasi), pilih Honda Vario 125 2022 → PLP 470 produk dengan banner kecocokan, badge "Cocok" (DEMO) dan "Disebut untuk…"; PDP bervarian (`?v=`, SKU varian, breadcrumb), cek kecocokan terverifikasi; tambah ke keranjang (toast + badge + localStorage); wishlist guest → login; mobile 375 (sticky buy bar); status 404 rute tidak dikenal.

## Fase 5 — Keranjang dan checkout
- [x] Keranjang: Zustand untuk guest, sinkron ke `carts` saat login; Sheet + halaman `/cart` (D-28)
- [x] Validasi stok real-time di keranjang (RPC `cart_lines`, stok tersedia = stok − reservasi aktif)
- [x] Checkout: alamat → kurir & ongkir → voucher → pembayaran → ringkasan
- [x] Integrasi Biteship: cek tarif dengan berat aktual vs volumetrik — kode siap (`ShippingProvider`, D-30); **menunggu** API key, origin gudang [P-11], daftar kurir [P-12] di env. Dev memakai tarif uji.
- [x] Voucher dan flash sale diterapkan di server
- [x] **Perhitungan ulang total di server** (harga, diskon, ongkir) sebelum membuat pesanan (RPC `place_order`, D-29)
- [x] Reservasi stok saat pesanan dibuat, dilepas otomatis saat expired (cron `/api/cron/expire-orders`)
- [x] Rate limit + Turnstile di checkout (Upstash; fallback in-memory sampai env Upstash diisi)
- [x] Halaman sukses pesanan

**Catatan fase:**
- Migration `20261008000100_checkout.sql`: `orders.checkout_key` (idempotency), `order_items.flash_sale_item_id`, helper `private.available_stock / price_lines / apply_voucher / release_order_holds`, RPC `cart_lines` (publik), `checkout_quote`, `place_order`, `release_expired_orders` (service role saja).
- Server: `src/server/actions/{cart,address,checkout}.ts`, `src/server/queries/{cart,checkout}.ts`, `src/lib/shipping/{provider,biteship,stub,weight}.ts`, `src/lib/security/rate-limit.ts`, `src/lib/validations/{address,checkout}.ts`.
- UI: `CartSync` di layout publik, `CartSheet` di header, `/cart`, `/checkout`, `/checkout/success`. Legacy dihapus: `checkout-page-client`, `api/checkout/create`, `api/coupons/validate`, `api/shipping/rates`, `cart/_actions`, `cart-line-card`, `cart-client-shell`, `cart-checkout-stepper`, `coupon-discount`, `user-cart-lines`. Dibiarkan untuk Fase 7/8: `lib/orders/cancel-expired`, `lib/biteship/fetch-courier-rates`, `api/shipping/areas` (dashboard legacy).
- Dev: `store_settings.mayar_enabled` dan `manual_transfer_enabled` dinyalakan; `.env.local` `SHIPPING_TEST_RATES=true`.
- Diuji di browser (akun uji sementara, sudah dihapus): merge keranjang guest saat login, tambah alamat, tarif uji, voucher 10%, buat pesanan (klik ganda = 1 pesanan), DB berisi order + 3 reservasi + shipment, cart kosong, cron expired melepas reservasi & voucher. Mobile 375 px tanpa scroll horizontal.
- Cek: `pnpm test` 50/50, `pnpm test:rls` 26/26, typecheck, lint 0 error.
- Menunggu: env Upstash, Turnstile, Biteship (key, `BITESHIP_ORIGIN_AREA_ID`/kode pos, `BITESHIP_COURIERS`), jadwal cron-job.org tiap 10 menit, berat/dimensi produk nyata (sementara `DEFAULT_ITEM_WEIGHT_GRAMS`).

## Fase 6 — Pembayaran (D-31: Mayar saja)
- [x] Interface `PaymentProvider` (`createPayment`, `verifyWebhook`, `getStatus`, `close`) (D-08)
- [x] Provider Mayar: buat pembayaran, redirect, webhook dengan verifikasi token + idempotency (`webhook_events`) — **menunggu** `MAYAR_API_KEY` + `MAYAR_WEBHOOK_TOKEN` dari user; dev memakai simulator (D-32)
- [x] ~~Provider transfer manual~~ — dibatalkan (D-31); toggle dimatikan, abstraksi disimpan
- [x] Toggle provider aktif di `store_settings` (checkout hanya menampilkan provider aktif; UI admin di Fase 8)
- [x] Expired otomatis untuk pesanan tidak dibayar (cron Fase 5 + payment ikut expired + tutup link Mayar; batas waktu dari `payment_timeout_minutes`, UI admin Fase 8)
- [x] Update status pesanan dan stok final setelah pembayaran terkonfirmasi (RPC `mark_order_paid`)

**Catatan fase:**
- Migration `20261009000100_payments.sql`: `payments.method`, `payments.transaction_ref`, unik 1 payment pending per order, RPC `mark_order_paid` (service role, idempotent: settled / already_paid / amount_mismatch / paid_after_cancel), `release_expired_orders` mengembalikan `(order_id, provider_ref)` dan meng-expire payment.
- `src/lib/payments/`: `provider`, `mayar` (klien HTTP dipindah dari legacy; `lib/mayar/client.ts` tinggal re-export), `mayar-method`, `mayar-webhook`, `test-provider`, `settle`, `start`. Legacy `reconcile-mayar`, `apply-paid-order`, `close-pending`, `manual-refund` ditandai `@deprecated` (dashboard lama, Fase 7/8).
- UI: checkout redirect ke halaman bayar; `/checkout/success` jadi halaman status (Bayar sekarang, Cek status, cek otomatis saat kembali); simulator `/checkout/pay-test/[ref]`.
- Dev: `manual_transfer_enabled = false`; `.env.local` `PAYMENT_TEST_MODE=true`.
- Diuji di browser (akun uji sementara, sudah dihapus): checkout → simulator → batal → "Bayar sekarang" memakai link sama → bayar berhasil → status "Pembayaran diterima"; DB: order paid, payment paid, reservasi consumed, movement sale, stok turun, notifikasi user. Webhook: tanpa/salah token 401, kiriman ganda diproses sekali. Stok DEMO dikembalikan dengan movement `correction`.
- Cek: `pnpm test` 54/54, `pnpm test:rls` 29/29, typecheck, lint 0 error.
- Menunggu user: kunci Mayar sandbox/produksi + token webhook, daftarkan URL webhook di dashboard Mayar.

## Fase 7 — Dashboard user (`/account`)
- [x] Ringkasan akun
- [x] Profil dan keamanan (ganti password, keluar dari semua perangkat, hapus akun = anonimisasi D-35)
- [x] Buku alamat
- [x] Garasi Saya (tambah/hapus kendaraan, set default)
- [x] Pesanan: daftar dengan filter status, detail dengan timeline, lacak pengiriman (stub sampai Biteship & resi Fase 8), batalkan pesanan belum bayar, konfirmasi diterima
- [x] Bayar ulang pesanan pending — ~~upload bukti transfer~~ dibatalkan (D-31)
- [x] Unduh invoice PDF (D-09) — dikerjakan di Fase 9 (D-34, D-41): tombol "Unduh invoice" aktif setelah lunas
- [x] Wishlist (`/account/wishlist`)
- [x] Ulasan produk (setelah pesanan diterima), dengan foto (moderasi di Fase 8)
- [x] Voucher saya (voucher publik + riwayat, D-33)
- [x] Pengajuan retur (jendela 7 hari, D-36) dan klaim garansi, dengan foto/video
- [x] Notifikasi (halaman + lonceng header membaca tabel NZO)

**Catatan fase:**
- Migration `20261012000100_account.sql` (`vouchers.is_public` + policy publik, `my_voucher_history`, `store_settings.return_window_days`, `private.can_request_return` + policy retur baru, `cancel_my_order`, `complete_my_order`, `anonymize_my_account`) dan `20261012000200_account_helpers.sql` (`store_return_window_days`).
- Rute di `src/app/(public)/account/*` (shell storefront). DAL `src/server/queries/account.ts`, actions `src/server/actions/account/{profile,garage,orders,media,after-sales,notifications}.ts`, `setDefaultAddress` di `address.ts`. `ShippingProvider.track` ditambahkan (Biteship + stub).
- Legacy dihapus: `src/app/(dashboard)/**`, `src/components/dashboard/**`, `lib/data/dashboard-user.ts` (profil auth store pindah ke `lib/data/user-profile.ts`), `api/{orders,addresses,wishlist,notifications,profile,complaint-upload,review-upload,upload}`, `components/layout/navbar.tsx`, `lib/payments/{reconcile-mayar,apply-paid-order,manual-refund}`, `store/notification-store`. Redirect permanen `/dashboard/*` dan `/wishlist` ke `/account`; default redirect auth jadi `/account`.
- Diuji di browser (akun uji sementara, sudah dihapus beserta pesanan & file): ringkasan, detail pesanan, lacak (stub), ulasan (tersimpan menunggu moderasi), retur (dalam jendela), konfirmasi diterima, batalkan pesanan, voucher publik, notifikasi tandai dibaca, garasi, ubah profil, hapus akun (teranonim, pesanan tetap). Upload storage diuji via skrip: folder sendiri OK, folder orang lain & MIME salah ditolak. Cek lebar mobile otomatis tidak bisa (pane tersembunyi, iframe diblokir header keamanan); layout memakai grid/flex responsif dan nav scroll horizontal.
- Cek: `pnpm test` 61/61, `pnpm test:rls` 34/34, typecheck, lint 0 error.
- Uji lanjutan (Claude in Chrome + Chrome headless CDP 390px): unggah foto ulasan dari form (tersimpan, 1 foto, menunggu moderasi), tambah kendaraan dari Garasi (jadi aktif), lonceng header langsung segar setelah "Tandai semua dibaca" (event `nzo:notifications-changed`). Ditemukan & diperbaiki: semua halaman `/account` melebar ke 1018px di HP (kolom grid terdorong baris chip menu, diperbaiki `grid-cols-[minmax(0,1fr)]`), header sempat tampil "Masuk/Daftar" saat sudah login (status login kini dikirim dari server ke `StoreHeader`), scrollbar chip menu, ukuran field kata sandi.

## Fase 8 — Dashboard admin (`/admin`)
Dikerjakan dalam 5 sub-batch 8A–8E (D-37).

- [x] Beranda: KPI (penjualan, pesanan, produk terlaris, stok menipis) + grafik — 8A
- [x] Produk: daftar, tambah/edit (semua field, varian, spesifikasi, fitment, gambar Cloudinary, SEO), draft/publish, duplikat, bulk action, import/export — 8A
- [x] Kategori (drag urutan, parent–child) dan brand — 8B
- [x] Data kendaraan (merek, model, tahun) — 8B
- [x] Stok: mutasi, penyesuaian dengan alasan, riwayat ledger, notifikasi stok menipis — 8A
- [x] Pesanan: daftar dengan filter, detail, ubah status, ~~verifikasi/tolak bukti transfer~~ (D-31), input resi (D-40), batalkan/refund — 8A
- [x] Promo: voucher, diskon produk/kategori (D-38, bulk harga coret di 8A), flash sale — 8C; ~~bundling~~ change request (D-38)
- [x] Konten: banner, bar promo, halaman statis (D-39) — 8C; urutan section beranda tetap di kode (section tanpa data tidak dirender)
- [x] Ulasan: moderasi (tampilkan/sembunyikan/balas) — 8D
- [x] Pelanggan: daftar, detail, riwayat belanja, segmentasi sederhana, blokir — 8D
- [x] Retur dan klaim garansi — 8D
- [x] Laporan: penjualan per periode, produk, kategori, pembayaran; export Excel — 8E
- [x] Staf dan role (owner, admin, warehouse, cs) — 8E
- [x] Audit log (read-only, filter data/aksi/tanggal) — 8E
- [x] Pengaturan toko: info toko, provider pembayaran, kurir (env), batas waktu bayar, data pengirim, MFA staf — 8E; rekening transfer manual disembunyikan (D-31), pajak menunggu [P-07], data gudang [P-11]
- [x] Riwayat import Jubelio/CSV — 8B (log per batch)

**Catatan fase:**
- **8A (operasional):**
  - Migration `20261012000300_admin_operations` (RPC `admin_dashboard_stats`, `admin_set_order_status` dengan matriks transisi, trigger notifikasi stok menipis), `…0400_admin_products` (`admin_bulk_discount`, `admin_duplicate_product`), `…0500` (stok menipis vs habis dipisah), `…0600` (index terlaris `total_sold, published_at`; beranda 1,8 dtk menjadi 1 ms).
  - Guard aksi admin `src/server/actions/admin/_guard.ts` (`ROLES`, `adminGuard`). DAL `src/server/queries/admin/{dashboard,orders,products,stock}.ts`.
  - Halaman `/admin`, `/admin/orders`, `/admin/orders/[number]`, `/admin/products` (+ `/new`, `/[id]` tab Data utama/Varian/Spesifikasi/Kecocokan, `/export` XLSX), `/admin/stock`. Halaman legacy pesanan/produk/stok dihapus (kecuali `/admin/products/[id]/images`).
  - Edit nama/harga oleh admin mengunci produk dari import ulang (`import_locked`, D-24). Varian yang dihapus dinonaktifkan (riwayat pesanan tetap utuh).
  - `ShippingProvider.createShipment` (opsional): Biteship `POST /v1/orders` memakai `store_settings.shipper`; tanpa key/P-11 hanya input resi manual (D-40).
  - `next.config.ts` `logging.serverFunctions: false`: log dev Next 16 mencetak argumen server action (password/alamat), melanggar security rule 13.
  - Diuji di browser (akun admin + pembeli uji, dev): dashboard, pesanan diproses lalu dikirim dengan resi (notifikasi user), simpan produk (audit + `import_locked`), penyesuaian stok (ledger `correction`, toast). Cek headless 1366 px: tanpa overlay error, tanpa scroll horizontal.
  - Cek: `test:rls` 40/40 (6 tes baru 8A).
  - Akun uji dipakai lagi di 8B–8E; dihapus di akhir Fase 8.
- **8B (struktur katalog):**
  - Migration `20261012000700_admin_catalog`: `admin_reorder_categories` (satu induk), `admin_delete_category` (tolak bila ada subkategori/produk, karena `product_categories` cascade), `admin_delete_brand` (tolak bila dipakai produk), `admin_delete_vehicle_model` (tolak bila ada kecocokan/garasi), `admin_catalog_counts`. Tulis biasa lewat RLS `*_write` + trigger audit.
  - `/admin/categories`: pohon 3 tingkat, urutan seret `@dnd-kit/sortable` (mouse, sentuh, keyboard) per kelompok saudara, dialog tambah/ubah (cegah induk siklik), hapus lewat AlertDialog. `DndContext id` dari `useId` (tanpa itu hydration mismatch `aria-describedby`).
  - `/admin/brands`: tabel + cari, dialog dengan logo Cloudinary `nzo/brands` (diverifikasi Admin API: JPG/PNG/WebP ≤ 2 MB).
  - `/admin/vehicles` (menu baru "Kendaraan"): daftar merek per jenis + tabel model per merek, validasi rentang tahun; jenis merek terkunci bila sudah punya model.
  - `/admin/import`: tombol Log per batch (Sheet, maks 200 baris `import_logs`).
  - Legacy kategori/brand GeekyTech dihapus. Semua perubahan me-revalidate tag `catalog`.
  - Diuji di browser: tambah subkategori, seret urutan (tersimpan di DB), hapus kategori berisi ditolak, hapus kategori kosong; tambah/hapus brand; tambah model (validasi tahun) lalu hapus. Headless 1366 px: tanpa error console/overlay.
  - Cek: `test:rls` 43/43 (3 tes baru 8B), `test` 66/66, typecheck, lint 0 error.
- **8C (promo & konten):**
  - Migration `20261013000100_admin_promo_content`: `banners.image_public_id` boleh kosong khusus `promo_bar` (check `banners_image_required`), batas panjang teks banner; tabel `content_pages` (slug tetap 7 halaman, Markdown, `is_published`, tidak boleh tayang dengan isi kosong) + RLS (publik baca yang tayang, owner/admin ubah, tanpa insert/delete dari aplikasi) + audit.
  - `/admin/vouchers` (tabel + dialog: persen/nominal, maks potongan, min belanja, kuota, per pelanggan, periode WIB, aktif, publik D-33; total potongan dari `voucher_redemptions`; voucher terpakai tidak bisa dihapus).
  - `/admin/flash-sales` + `/[id]`: event (periode wajib) dan item (cari produk/varian, harga flash sale wajib di bawah harga normal dari DB, kuota ≥ terjual). Event yang sudah ada penjualan tidak bisa dihapus.
  - `/admin/banners`: dikelompokkan per posisi (bar promo, utama, promo, kategori), gambar desktop/mobile Cloudinary `nzo/banners` diverifikasi Admin API (helper bersama `src/lib/cloudinary/verify.ts`), urutan naik/turun, link hanya `/…` atau `https://`.
  - `/admin/pages` + `/[slug]`: editor Markdown (Tulis/Pratinjau). Halaman publik (`/about`, `/faq`, `/how-to-buy`, `/contact`, `/kebijakan-privasi`, `/syarat-ketentuan`, `/kebijakan-pengembalian`) memakai konten DB bila tayang, selain itu teks bawaan. Render lewat `react-markdown` tanpa HTML mentah/gambar, link `javascript:` dinetralkan.
  - Rute legacy `/admin/coupons`, `/admin/promotions/*` dihapus (redirect permanen). File storefront legacy yang mati ikut dihapus (`lib/data/home-storefront`, `product-detail-page`, `home-product-tile`, `banner-template-utils`).
  - Bug ditemukan & diperbaiki: `zodResolver` mengirim nilai hasil transform (ISO UTC) ke server action yang mem-parse ulang dengan regex waktu lokal, jadi simpan gagal. `wibDateTime` kini menerima keduanya + unit test parse ganda. `saleState()` dari file client dipanggil server component, dipindah ke `src/lib/promo/status.ts`.
  - Diuji di browser: tayangkan FAQ dari editor, tampil di `/faq` (link `javascript:` dan `<script>` tidak dirender), lalu kembali ke teks bawaan; bar promo tampil di storefront dengan link `/promo` (link `//…` ditolak) lalu dihapus; flash sale dibuat, harga ≥ normal ditolak, item 49.000 tampil di beranda, lalu dihapus; voucher dibuat dan dihapus.
  - Cek: `test:rls` 45/45 (2 tes baru 8C), `test` 71/71, typecheck, lint 0 error.
  - Catatan dev: overlay dev menampilkan "Encountered a script tag" dari `ThemeProvider` (next-themes + React 19) saat navigasi client; bawaan lama, hanya dev.
- **8D (pelanggan & after-sales):**
  - Migration `20261013000200_admin_after_sales`: RPC `admin_customers` (owner/admin/cs; email dari `auth.users`, jumlah & total belanja pesanan dibayar, segmen baru/aktif/tidak aktif/teratas/diblokir, paginasi), `admin_set_after_sales_status` (matriks transisi retur & klaim, resolusi wajib di status akhir, notifikasi `after_sales` ke pelanggan), `admin_moderate_review` (status + balasan, `replied_by/at`, notifikasi `review_reply` bila dibalas).
  - `/admin/reviews`: filter status (default Menunggu) & rating, foto ulasan, Tayangkan/Sembunyikan/Balas (balasan sekaligus menayangkan). Rating produk dihitung ulang trigger lama.
  - `/admin/customers` (+ `/[id]`): cari nama/email/telepon, segmen, detail profil + KPI + riwayat pesanan + alamat; blokir/buka blokir (owner/admin lewat `set_user_blocked`, cs lihat saja).
  - `/admin/returns` (+ `/[kind]/[id]`): retur & klaim digabung, filter jenis + "Perlu ditangani", detail pengajuan, lampiran privat lewat signed URL 5 menit, form status sesuai matriks.
  - Legacy GeekyTech customers/reviews/returns/complaints dihapus.
  - Bug ditemukan & diperbaiki: form status retur menyimpan pilihan lama setelah refresh (status baru tidak ada di opsi), sekarang di-reset dengan `key={status}`.
  - Catatan dev: menghapus lalu membuat ulang folder rute saat `next dev` berjalan bisa membuat rute baru 404 sampai dev server di-restart; file `.next/dev/types/validator.ts` bisa terpotong (hapus, dibuat ulang).
  - Diuji di browser (data uji dibuat lewat SQL lalu dihapus): balas ulasan (tayang + notifikasi), setujui retur dengan catatan (notifikasi), tolak klaim (tombol simpan nonaktif tanpa resolusi, lalu status final). Headless: daftar/segmen/detail pelanggan, daftar retur.
  - Cek: `test:rls` 48/48 (3 tes baru 8D).
- **8E (administrasi):**
  - Migration `20261014000100_admin_administration`: RPC `admin_sales_report` (owner/admin; periode WIB maks 1 tahun, per hari/bulan, total, produk, kategori induk, metode bayar), `admin_staff_list` (owner/admin, email + masuk terakhir), `admin_find_user` (owner, email persis). `20261014000200_shipment_system_rpcs`: `system_apply_shipment_update` dan `system_complete_delivered_orders` (service role saja).
  - `/admin/reports` (+ `/export` XLSX 5 sheet), `/admin/staff` (ubah role & tambah staf dari akun terdaftar, owner saja; konfirmasi AlertDialog), `/admin/audit` (filter data/aksi/tanggal, diff field before→after, data lengkap), `/admin/settings` (owner ubah, admin lihat; menyalakan MFA staf ditolak bila sesi owner belum aal2 supaya tidak terkunci), `/admin/notifications` (notifikasi staf: stok menipis, bayar setelah batal).
  - Webhook Biteship ditulis ulang di schema NZO: token `?token=` wajib (`BITESHIP_WEBHOOK_SECRET`, banding waktu-konstan), idempoten lewat `webhook_events`, status lewat RPC. Cron `/api/cron/complete-delivered-orders` pakai Bearer `CRON_SECRET` (sebelumnya query `?secret=`). Helper `src/lib/security/secret.ts`.
  - Legacy GeekyTech dihapus total: modul admin notifications/reports/settings/print label, `/api/admin/*`, komponen bell/panel lama, `src/lib/supabase/legacy`, `src/types/legacy-supabase.ts`, dan helper mati (biteship lama, notifikasi lama, cancel-expired, close-pending, dll). Auth store/provider, profil header, logout, 404 pindah ke client & tipe NZO. Cache geocode kode pos jadi memori proses (tabel `geocode_cache` tidak ada di schema NZO). Aturan ESLint pelarang import legacy dipertahankan.
  - Nav admin: tambah Notifikasi, Staf & role, Audit log.
  - Cek: `test:rls` 52/52 (4 tes baru 8E), `test` 71/71, typecheck, lint 0 error, `build` ✓. Headless 1366 px: semua halaman admin 8E + beranda, PDP, 404, `/account` tanpa error console. Export laporan XLSX valid; webhook Biteship & cron menolak tanpa kredensial (401).
  - Akun uji admin & pembeli (dipakai 8A–8E) beserta pesanannya dihapus; stok DEMO-OLI-001 kembali 120.

## Fase 9 — Dokumen cetak
- [x] Invoice PDF A4 sesuai design-system.md §12 — format pajak menunggu [P-07] (D-42, mode `none`)
- [x] Resi A5 dengan barcode (`bwip-js`) — data pengirim dari Pengaturan, menunggu [P-11]
- [x] Cetak resi massal (pilih banyak pesanan → satu PDF)
- [x] Nomor invoice berurutan dan tidak bisa diubah (D-41)

**Catatan fase:**
- Migration `20261014000300_invoices`: `orders.invoice_number` (unik, format `INV/YYYY/000001`, urut per tahun WIB lewat `invoice_counters` + lock baris) dan `invoice_issued_at`. Diterbitkan trigger `orders_invoice` saat status pertama kali menjadi `paid` (mencakup `mark_order_paid` dan aktivasi ulang admin) — lebih aman daripada menyalin ulang body fungsi pelunasan; trigger yang sama menolak perubahan/penghapusan nomor, termasuk oleh service role. Backfill pesanan lunas lama. `store_settings.tax_mode` (`none`/`ppn_included`).
- PDF dirender di server dengan `@react-pdf/renderer` (font Outfit woff OFL di `src/lib/pdf/fonts/`, logo `public/logo.png`, logo kurir `public/couriers/`), barcode Code128 `bwip-js/node` (import subpath karena `moduleResolution: bundler`). File dibaca dari disk: `outputFileTracingIncludes` di `next.config.ts`.
- Rute: `/account/orders/[number]/invoice` (RLS = hanya pemilik, 404 bila belum lunas), `/admin/orders/[number]/invoice` (staf), `/admin/orders/labels?numbers=…` (owner/admin/gudang; maks 50; hanya paid/processing/shipped, pesanan lain diabaikan). Info toko dibaca service role karena `store_settings` tidak terbaca pelanggan.
- UI: tombol "Unduh invoice" di detail pesanan akun (sebelumnya nonaktif, D-34); "Invoice" + "Cetak resi" di detail pesanan admin dengan peringatan bila data pengirim kosong; filter "Siap kirim" + checkbox + bar "Cetak resi (n)" di daftar pesanan.
- Resi tanpa nomor resi kurir memakai barcode nomor pesanan dengan label "belum ada resi kurir". Pembayaran selalu NON-COD sampai P-12.
- Diuji (skrip e2e dengan akun uji sementara, dihapus setelahnya; stok DEMO dikembalikan): nomor invoice terbit berurutan; pembeli unduh invoice (PDF valid), pesanan orang lain dan belum lunas 404, tanpa login dialihkan; admin unduh invoice; resi tunggal; resi massal 3 halaman (pesanan pending diabaikan); pelanggan tidak bisa cetak resi; nomor tidak valid 400. PDF diperiksa visual (invoice A4, resi A5). Headless: daftar pesanan (checkbox), detail admin (tombol dokumen), detail akun (tombol invoice) tanpa error.
- Cek: `test:rls` 54/54 (2 tes baru), unit test format dokumen.

## Fase 10 — Notifikasi dan email
- [ ] Template React Email dengan gaya brand: verifikasi, reset password, pesanan dibuat, instruksi pembayaran, pembayaran diterima, bukti ditolak, pesanan dikirim + resi, pesanan selesai + ajakan ulasan, update retur/garansi
- [ ] Pengiriman via Resend, domain terverifikasi (SPF, DKIM, DMARC) [P-09]
- [ ] Notifikasi in-app (tabel `notifications`) + toast
- [ ] Notifikasi WhatsApp [P-10]

**Catatan fase:**

## Fase 11 — SEO, analitik, dan legal
- [ ] Metadata dinamis, Open Graph, canonical
- [ ] JSON-LD: Product, Offer, AggregateRating, BreadcrumbList, Organization
- [ ] `sitemap.xml` dan `robots.txt`
- [ ] GA4 dan Meta Pixel (event: view_item, add_to_cart, begin_checkout, purchase) dengan consent
- [ ] Kebijakan privasi, syarat & ketentuan, kebijakan retur/garansi [P-08]

**Catatan fase:**

## Fase 12 — Security hardening dan QA
- [ ] Review semua RLS policy dan test akses silang antar user/role
- [ ] Cek tidak ada secret di bundle client
- [ ] Uji manipulasi harga/total dari client, IDOR pesanan, upload file berbahaya
- [ ] Uji webhook palsu dan replay
- [ ] Rate limit dan Turnstile aktif di semua titik
- [ ] `pnpm audit` dan update dependency
- [ ] Lighthouse (performa, aksesibilitas, SEO) mobile dan desktop
- [ ] Uji `prefers-reduced-motion` dan navigasi keyboard
- [ ] Uji end-to-end alur beli: guest → daftar → checkout → bayar (Mayar dan transfer) → resi → selesai → ulasan

**Catatan fase:**

## Fase 13 — Launch dan serah terima
- [ ] Upgrade paket hosting ke produksi [P-03]
- [ ] Domain, DNS, SSL [P-09]
- [ ] Backup database terjadwal
- [ ] Import produk final + review draft bersama klien
- [ ] Akun owner/admin klien; putuskan ulang flag `require_staff_mfa` sebelum launch (D-20, rekomendasi: nyalakan)
- [ ] Panduan singkat admin (kelola produk, pesanan, resi, promo)
- [ ] Pendaftaran PSE [P-08]

**Catatan fase:**

---

## Backlog fase berikutnya (di luar scope awal, lewat change request — D-14)
- [ ] Sinkronisasi stok dua arah dengan Jubelio (cron dari script import) [P-04]
- [ ] Harga bertingkat reseller/bengkel [P-06]
- [ ] Integrasi atau migrasi dari Shopify [P-05]
- [ ] Notifikasi WhatsApp otomatis [P-10]

## Changelog
- 0.1 (2026-09-30): Dokumen awal.
- 0.2 (2026-09-30): Fase 0 dikerjakan (kecuali task akun yang menunggu user), catatan fase diisi.
- 0.3 (2026-10-01): Repo GitHub ter-push, akun Supabase/Resend dibuat user, Cloudinary pakai akun bersama dengan root `nzo/` (D-16).
- 0.4 (2026-10-01): Supabase siap (D-17), env tervalidasi.
- 0.5 (2026-10-01): Fase 1 dikerjakan (kecuali uji email & SMTP Resend), catatan fase diisi.
- 0.6 (2026-10-02): D-20 (MFA staf lewat flag, default mati), fix reset password akun ber-TOTP, uji auth user.
- 0.7 (2026-10-02): Fase 2 selesai (kecuali logo resmi), redesign shell, codemod palet GeekyTech.
- 0.9 (2026-10-07): Fase 4 selesai (storefront NZO: beranda, PLP, PDP, Garasi, wishlist, halaman statis).
- 0.12 (2026-10-12): Fase 7 selesai (dashboard user `/account`, D-33…D-36). Invoice dipindah ke Fase 9.
- 0.11 (2026-10-08): Fase 6 selesai (Mayar saja, D-31; simulator dev, D-32). Transfer manual dibatalkan.
- 0.10 (2026-10-08): Fase 5 selesai (keranjang, checkout, ongkir lewat ShippingProvider, reservasi stok, cron expired). Biteship asli menunggu env/P-11/P-12.
- 0.8 (2026-10-06): Fase 3 (katalog, import export Jubelio, Cloudinary, kategori & kendaraan). Logo resmi dicentang. Script API Jubelio dan stok/foto nyata tetap menunggu P-04.
