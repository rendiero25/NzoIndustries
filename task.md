# task.md — NZO Industries E-commerce

Versi dokumen: 0.5 (2026-10-01). Aturan, keputusan (`D-xx`), dan pending klien (`P-xx`) ada di `CLAUDE.md`. Aturan visual ada di `design-system.md`.

**Legenda:** `[ ]` belum, `[x]` selesai, `[P-xx]` bergantung pada info klien (kerjakan dengan stub/feature flag, jangan menebak).

**Definition of done tiap fase:** `lint` + `typecheck` + `build` lolos, RLS tabel baru teruji, UI sesuai design-system.md (mobile dan desktop), catatan fase diisi.

---

## Fase 0 — Setup dan fondasi
- [x] Fork starter GeekyTech, buang modul yang tidak relevan, rename ke `nzo-industries` (D-01, D-15)
- [x] Repo GitHub dengan dua branch: `development` → preview, `main` → production — `github.com/rendiero25/NzoIndustries`, kedua branch ter-push (D-16)
- [ ] Buat project Supabase dan project Vercel [P-03] — Supabase ✓ (region `ap-southeast-2`, D-17; kunci di `.env.local` tervalidasi, DB kosong, `/api/health` cek DB `ok`). **Menunggu** project Vercel (region function `syd1`)
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
- [ ] Supabase Auth: email + password, verifikasi email, reset password, SMTP via Resend [P-09] — kode siap (daftar, aktivasi, lupa/reset password). **Menunggu**: uji alur email oleh user dengan inbox sendiri; SMTP Resend setelah domain (P-09)
- [x] MFA (TOTP) wajib untuk role staf (owner, admin, warehouse, cs) — di RLS (aal2) dan guard server; diuji end-to-end di browser
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
- [ ] Token warna, radius, dan tipografi di `globals.css` sesuai design-system.md §2–4 (D-02)
- [ ] Font Outfit via `next/font/google`
- [ ] Install komponen shadcn yang tercantum di design-system.md §7 (D-03)
- [ ] Install Magic UI terbatas: Marquee, NumberTicker, BlurFade
- [ ] Setup GSAP + ScrollTrigger + hook `useReducedMotion` (D-11)
- [ ] Sonner di root layout dengan konfigurasi posisi/durasi §9 (D-10)
- [ ] Komponen dasar: `Price`, `ProductCard`, `FitmentBadge` (motif perisai), `EmptyState`, `PageHeader`, skeleton set
- [ ] Halaman `/design` (dev only) untuk preview token dan komponen

**Catatan fase:**

## Fase 3 — Katalog, gambar, dan import produk
- [ ] Integrasi Cloudinary: route signature `/api/cloudinary/sign` (admin only), `CldImage`, folder sesuai design-system.md §11
- [ ] Import CSV/Excel (fallback dan untuk update massal): upload → staging → preview → commit sebagai draft
- [ ] Script `scripts/import-jubelio.ts` [P-04]:
  - [ ] Login token dan ambil produk + varian dengan pagination (cek endpoint di docs.jubelio.com)
  - [ ] Mapping field Jubelio ke schema, rapikan nama/SKU yang tidak sesuai (D-06), ambil harga dari sumber yang dipilih [P-01]
  - [ ] Unduh foto lalu upload ke Cloudinary
  - [ ] Tulis ke `import_products`, mode `--dry-run`, upsert by SKU (idempotent)
  - [ ] Log hasil: berhasil, gagal, dilewati + alasan
  - [ ] Commit ke `products` sebagai `draft`
- [ ] Kategori untuk produk non-otomotif (D-07)
- [ ] Data merek/model/tahun kendaraan awal

**Catatan fase:**

## Fase 4 — Storefront
- [ ] Layout: header, bar promo, navigasi, footer, tombol WhatsApp mengambang
- [ ] Beranda sesuai urutan section design-system.md §5 (hero + pemilih kendaraan, chip kategori, banner, flash sale, terlaris/terbaru, brand, statistik, ulasan)
- [ ] Animasi hero (GSAP timeline) dan micro-interaction §8
- [ ] Halaman kategori, brand, promo, dan pencarian dengan filter (kendaraan, kategori, brand, harga, rating, stok) dan urutan
- [ ] Pemilih kendaraan global: tersimpan di cookie untuk guest, di Garasi untuk user login
- [ ] Detail produk: galeri, varian, cek kecocokan, tabs (deskripsi, spesifikasi, kecocokan, cara pasang, ulasan), produk terkait, sticky buy bar mobile
- [ ] Wishlist
- [ ] Halaman statis: tentang, kontak, FAQ, cara belanja [P-08]

**Catatan fase:**

## Fase 5 — Keranjang dan checkout
- [ ] Keranjang: Zustand untuk guest, sinkron ke `carts` saat login; Sheet + halaman `/cart`
- [ ] Validasi stok real-time di keranjang
- [ ] Checkout: alamat → kurir & ongkir → voucher → pembayaran → ringkasan
- [ ] Integrasi Biteship: cek tarif dengan berat aktual vs volumetrik [P-11] [P-12]
- [ ] Voucher dan flash sale diterapkan di server
- [ ] **Perhitungan ulang total di server** (harga, diskon, ongkir) sebelum membuat pesanan
- [ ] Reservasi stok saat pesanan dibuat, dilepas otomatis saat expired (cron)
- [ ] Rate limit + Turnstile di checkout
- [ ] Halaman sukses pesanan

**Catatan fase:**

## Fase 6 — Pembayaran [P-02]
- [ ] Interface `PaymentProvider` (`createPayment`, `verifyWebhook`, `getStatus`) (D-08)
- [ ] Provider Mayar: buat pembayaran, redirect, webhook dengan verifikasi signature + idempotency (`webhook_events`)
- [ ] Provider transfer manual: kode unik 3 digit, instruksi rekening, upload bukti ke bucket privat (validasi tipe dan ukuran), status `awaiting_verification`
- [ ] Toggle provider aktif di `store_settings`
- [ ] Expired otomatis untuk pesanan tidak dibayar (batas waktu diatur admin)
- [ ] Update status pesanan dan stok final setelah pembayaran terkonfirmasi

**Catatan fase:**

## Fase 7 — Dashboard user (`/account`)
- [ ] Ringkasan akun
- [ ] Profil dan keamanan (ganti password, sesi aktif, hapus akun sesuai UU PDP)
- [ ] Buku alamat
- [ ] Garasi Saya (tambah/hapus kendaraan, set default)
- [ ] Pesanan: daftar dengan filter status, detail dengan timeline, lacak pengiriman
- [ ] Bayar ulang pesanan pending dan upload bukti transfer
- [ ] Unduh invoice PDF (D-09)
- [ ] Wishlist
- [ ] Ulasan produk (setelah pesanan selesai), dengan foto
- [ ] Voucher saya
- [ ] Pengajuan retur dan klaim garansi
- [ ] Notifikasi

**Catatan fase:**

## Fase 8 — Dashboard admin (`/admin`)
- [ ] Beranda: KPI (penjualan, pesanan, produk terlaris, stok menipis) + grafik
- [ ] Produk: daftar, tambah/edit (semua field, varian, spesifikasi, fitment, gambar Cloudinary, SEO), draft/publish, duplikat, bulk action, import/export
- [ ] Kategori (drag urutan, parent–child) dan brand
- [ ] Data kendaraan (merek, model, tahun)
- [ ] Stok: mutasi, penyesuaian dengan alasan, riwayat ledger, notifikasi stok menipis
- [ ] Pesanan: daftar dengan filter, detail, ubah status, verifikasi/tolak bukti transfer, input resi, batalkan/refund
- [ ] Promo: voucher, diskon produk/kategori, flash sale, bundling
- [ ] Konten: banner, bar promo, konten beranda, halaman statis
- [ ] Ulasan: moderasi (tampilkan/sembunyikan/balas)
- [ ] Pelanggan: daftar, detail, riwayat belanja, segmentasi sederhana, blokir
- [ ] Retur dan klaim garansi
- [ ] Laporan: penjualan per periode, produk, kategori, pembayaran; export CSV/Excel
- [ ] Staf dan role (owner, admin, warehouse, cs)
- [ ] Audit log (read-only, filter per user/aksi)
- [ ] Pengaturan toko: info toko, rekening, provider pembayaran, kurir, batas waktu bayar, pajak [P-07] [P-11]
- [ ] Riwayat import Jubelio/CSV

**Catatan fase:**

## Fase 9 — Dokumen cetak
- [ ] Invoice PDF A4 sesuai design-system.md §12 [P-07]
- [ ] Resi A5 dengan barcode (`bwip-js`) [P-11]
- [ ] Cetak resi massal (pilih banyak pesanan → satu PDF)
- [ ] Nomor invoice berurutan dan tidak bisa diubah

**Catatan fase:**

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
- [ ] Akun owner/admin klien dengan MFA
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
