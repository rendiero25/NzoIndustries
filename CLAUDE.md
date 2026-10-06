# CLAUDE.md — NZO Industries E-commerce

Versi dokumen: 0.9 (2026-10-07). Baca file ini di awal setiap sesi.

## Proyek
Web e-commerce untuk NZO Industries, penjual produk otomotif motor dan mobil (plus sebagian produk non-otomotif yang masuk kategori sendiri). Ada tiga area: storefront publik, dashboard user (`/account`), dan dashboard admin/CMS (`/admin`). Prinsip utama: **security first**.

## Dokumen terkait (wajib sinkron)
| File | Isi | Sumber kebenaran untuk |
|---|---|---|
| `CLAUDE.md` | Stack, aturan kode, security, aturan bisnis, keputusan, pending | Aturan & keputusan |
| `design-system.md` | Token warna/tipografi/radius, komponen, layout, motion, copy | Semua hal visual & UX |
| `task.md` | Fase kerja dan checklist | Urutan & status pekerjaan |

## Aturan sinkronisasi
1. ID keputusan (`D-xx`) dan pending klien (`P-xx`) hanya didefinisikan di file ini. `task.md` dan `design-system.md` cukup merujuk ID-nya.
2. Jika user menginfokan perubahan data/keputusan atau jawaban klien: update Decision Log / Pending di sini, update bagian terkait di dua file lain, naikkan versi ketiga file, dan catat di Changelog.
3. Task yang bergantung pada pending ditandai `[P-xx]` di `task.md`. Jangan menebak jawabannya: buat abstraksi, stub, atau feature flag, lalu lanjut ke task lain.
4. Jika instruksi di chat bertentangan dengan dokumen, tanyakan dulu sebelum mengubah kode.

## Tech stack
- **Framework:** Next.js (App Router, versi stabil terbaru), TypeScript strict, React Server Components default.
- **UI:** Tailwind CSS v4, shadcn/ui (semua komponen), Magic UI (storefront saja, daftar terbatas di design-system.md), lucide-react, font Outfit (`next/font/google`).
- **Animasi:** GSAP + ScrollTrigger (`@gsap/react`), CSS transitions untuk micro-interaction.
- **Backend:** Supabase (Postgres, Auth, RLS, Storage privat untuk bukti transfer), server actions + route handlers.
- **Gambar:** Cloudinary (`next-cloudinary`) untuk foto produk, banner, brand, konten. Upload selalu signed dari server.
- **Email:** Resend + React Email (transaksional dan SMTP untuk email Supabase Auth).
- **Pembayaran:** Mayar + transfer manual lewat lapisan `PaymentProvider` (lihat P-02).
- **Ongkir:** Biteship.
- **Form & validasi:** React Hook Form + Zod (schema dipakai bersama client dan server).
- **Tabel admin:** TanStack Table via shadcn Data Table.
- **State keranjang:** Zustand (guest) disinkron ke tabel `carts` saat login.
- **PDF:** `@react-pdf/renderer` (invoice, resi A5), barcode via `bwip-js`.
- **Keamanan:** Upstash Ratelimit, Cloudflare Turnstile.
- **Hosting & analitik:** Vercel (P-03), GA4, Meta Pixel.
- **Fondasi:** fork dari starter GeekyTech (schema, rules, workflow), lalu sesuaikan dengan dokumen ini.

## Struktur folder
```
src/app/(store)/        storefront publik
src/app/(auth)/         login, daftar, lupa password
src/app/account/        dashboard user
src/app/admin/          dashboard admin
src/app/api/            webhooks/(mayar|biteship), cloudinary/sign, cron
src/components/ui/      shadcn (generated)
src/components/magicui/ komponen Magic UI yang diizinkan
src/components/{store,account,admin,shared}/
src/server/queries/     data access layer (READ, cek auth di sini)
src/server/actions/     server actions (WRITE: auth guard + Zod)
src/lib/supabase/       server.ts, client.ts, admin.ts (service role, server-only)
src/lib/payments/       provider.ts, mayar.ts, manual-transfer.ts
src/lib/{shipping,cloudinary,email,pdf,auth,validations}/
src/emails/             template React Email
scripts/                import-jubelio.ts, import-csv.ts
supabase/migrations/    semua perubahan schema lewat migration
```

## Perintah
Package manager: pnpm 11 (`packageManager` di package.json). Build script dependency diizinkan lewat `allowBuilds` di `pnpm-workspace.yaml`.
- `pnpm dev`, `pnpm build` (keduanya `--webpack`, Turbopack bentrok dengan lightningcss), `pnpm lint`, `pnpm typecheck`, `pnpm test` (`node --test`, file `*.test.mts`), `pnpm format`
- Pre-commit (Husky + lint-staged): `eslint --fix` + `prettier --write` untuk file staged.
- Env: salin `env.example` ke `.env.local`. Env server dibaca lewat `getServerEnv()` (`src/lib/env.ts`), env publik lewat `getClientEnv()` (`src/lib/env.client.ts`).
- CSP dan security headers: `src/lib/security/csp.ts` + `headers()` di `next.config.ts`. Domain eksternal baru wajib ditambah di sana.
- Database (project sudah di-link, D-19): tulis file baru di `supabase/migrations/<timestamp>_<nama>.sql`, lalu `pnpm db:push` (cek dulu `pnpm exec supabase db push --dry-run`), `pnpm db:types` (tulis `src/types/database.ts`), `pnpm exec supabase db advisors --linked`. Seed: `pnpm db:seed`. Jangan ubah migration yang sudah diterapkan; buat migration baru.
- `pnpm test:rls`: test RLS ke project dev (membuat user test sementara lalu menghapusnya). Wajib lolos setiap ada tabel/policy baru.
- `pnpm promote-owner <email>`: jadikan akun pertama owner (service role). Role berikutnya lewat RPC `set_user_role` oleh owner.
- Fungsi helper policy ada di schema `private` (tidak diekspos API): `private.has_role(app_role[])`, `private.is_staff()`, `private.owns_order(uuid)`, dll. Role staf butuh MFA aal2 di RLS hanya bila `require_staff_mfa` menyala (D-20).
- Import katalog (D-24): `pnpm import:export "<export Daftar Harga Jubelio.xls>" --dry-run` (laporan di `scripts/out/`, gitignore), lalu tanpa `--dry-run` untuk menulis (staging → RPC `import_commit_batch` → produk `draft`). Aman diulang: upsert by SKU web. Update massal kecil lewat `/admin/import` (template NZO atau export Jubelio, diparse di browser). `pnpm import:jubelio --dry-run` = kerangka API Jubelio (P-04). Logika mapping bersama di `src/lib/import/`; data kategori/kendaraan bersumber di `src/lib/import/{categories,vehicles}.ts` (migration `20261006000200` di-generate dari sana).
- File export klien (`docs/*.xls*`, `docs/*.csv`) tidak di-commit.
- Storefront (Fase 4): rute `/products`, `/products/[slug]`, `/categories/[slug]`, `/brands`, `/brands/[slug]`, `/search`, `/promo`, `/wishlist`, `/about`, `/contact`, `/faq`, `/how-to-buy`. Data katalog lewat `src/server/queries/{catalog,reference,home,vehicle}.ts` (client anon tanpa cookie `src/lib/supabase/public.ts` untuk data publik/cache, `unstable_cache` tag `catalog`). PLP memakai RPC `catalog_search` + `catalog_facets` (filter di `private.catalog_filter`, plpgsql security definer, selalu `status = 'published'`); filter URL di `src/lib/validations/catalog.ts`. Kendaraan aktif: cookie `nzo_vehicle` + Garasi default (`user_vehicles`). Keranjang guest: `src/store/cart-store.ts` (snapshot tampilan; harga final dihitung server di Fase 5).
- Rute yang bisa `notFound()` jangan diberi `loading.tsx` (streaming dimulai sebelum 404, status jadi 200); bungkus konten lambat dengan `Suspense` setelah validasi.

## Konvensi kode
- Identifier dalam bahasa Inggris; semua teks UI dalam Bahasa Indonesia (aturan copy di design-system.md).
- Uang disimpan sebagai integer rupiah (`bigint`), bukan float. Format tampilan dengan `Intl.NumberFormat('id-ID')`.
- Waktu disimpan UTC, ditampilkan dalam `Asia/Jakarta`.
- Semua mutasi lewat server action dengan urutan: auth guard → validasi Zod → operasi → `revalidatePath/Tag`.
- Dilarang `alert()`, `confirm()`, `window.prompt()`. Notifikasi pakai Sonner, konfirmasi destruktif pakai AlertDialog.
- Semua komponen UI dari shadcn/ui. Jangan membuat komponen dasar sendiri jika shadcn sudah punya.
- Tidak ada `any`. Tipe database dari `supabase gen types`.
- Setiap fitur selesai harus lolos `lint`, `typecheck`, dan `build`.

## Aturan security (wajib, tanpa pengecualian)
1. RLS aktif di **semua** tabel. Tabel baru tanpa policy tidak boleh di-merge.
2. `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, kunci Mayar/Biteship/Jubelio hanya di server (`import 'server-only'`). Hanya variabel `NEXT_PUBLIC_*` yang boleh ke client.
3. Auth dan role dicek di data access layer dan server action. Middleware/proxy hanya untuk redirect UX, bukan satu-satunya proteksi (pelajaran dari CVE-2025-29927).
4. Harga, diskon, voucher, ongkir, dan total **selalu dihitung ulang di server** dari database. Nilai dari client diabaikan.
5. Webhook (Mayar, Biteship) wajib verifikasi signature dan idempotent (simpan event ID di `webhook_events`).
6. Rate limit di login, daftar, lupa password, checkout, upload bukti, dan API publik. Turnstile di form auth dan checkout.
7. RBAC dengan role: `owner`, `admin`, `warehouse`, `cs`, `customer`. MFA staf (Supabase Auth TOTP) dikendalikan flag `store_settings.require_staff_mfa` (D-20, default **mati** atas keputusan user). Kode MFA, RLS aal2, dan halaman `/admin/mfa` tetap ada; owner menyalakan flag untuk mewajibkannya lagi. Rekomendasi: nyalakan sebelum launch.
8. Setiap aksi admin tercatat di `audit_logs` (siapa, apa, kapan, before/after).
9. Upload Cloudinary hanya lewat signature dari server, dibatasi ke role admin, dengan folder dan tipe file yang ditentukan. Folder selalu di bawah `nzo/` (D-16); operasi hapus/rename hanya untuk public_id `nzo/...`.
10. Bukti transfer disimpan di bucket Supabase **privat**, divalidasi tipe (jpg/png/webp/pdf) dan ukuran (maks 5 MB), diakses via signed URL berumur pendek.
11. Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
12. Dependency Next.js/React/Supabase dipatch rutin. Jalankan `pnpm audit` sebelum rilis.
13. Jangan pernah log data sensitif (password, token, data pembayaran, alamat lengkap).
14. Kredensial Jubelio: akun integrasi khusus dari klien, disimpan di env server, tidak pernah di-commit.

## Aturan bisnis
- **Harga:** satu `price` + opsional `compare_at_price` untuk harga coret. Varian boleh punya `price` sendiri yang menggantikan harga produk (D-18). Sumber harga menunggu P-01.
- **Produk:** wajib nama, SKU unik, harga, stok. Field lain nullable dan dilengkapi admin dari dashboard. Status `draft | published | archived`; hanya `published` yang tampil.
- **Kategori:** hierarkis (parent–child), satu produk bisa di banyak kategori. Produk non-otomotif punya kategori sendiri.
- **Fitment kendaraan:** opsional per produk (merek → model → rentang tahun). Produk tanpa fitment tidak muncul di filter kecocokan.
- **Stok:** ledger `inventory_movements`. Stok di-reserve saat pesanan dibuat, dilepas saat expired/batal, dikurangi final saat dibayar.
- **Status pesanan:** `pending_payment → awaiting_verification (transfer manual) → paid → processing → shipped → delivered → completed`, plus `cancelled`, `expired`, `refunded`. Setiap perubahan dicatat di `order_status_history`.
- **Pembayaran:** interface `PaymentProvider` dengan provider `mayar` dan `manual_transfer`, bisa diaktif/nonaktifkan di pengaturan toko. Transfer manual memakai kode unik 3 digit dan diverifikasi admin.
- **Ongkir:** Biteship, berat dihitung dari yang terbesar antara berat aktual dan volumetrik (p×l×t/6000).
- **Dokumen:** invoice PDF (A4) diunduh user dari detail pesanan; resi A5 dicetak admin, bisa massal.
- **Import:** Jubelio → tabel staging → produk berstatus `draft` → admin review lalu publish. Upsert by SKU, simpan `jubelio_item_id`, foto diunggah ulang ke Cloudinary.

## Decision log
- D-01 Fondasi dari starter GeekyTech; stack sesuai bagian Tech stack.
- D-02 Warna mengikuti logo (hitam/putih) + satu aksen; font Outfit. Detail di design-system.md.
- D-03 Semua komponen shadcn/ui, termasuk dashboard admin dan user. Magic UI hanya di storefront.
- D-04 Satu harga per produk (+ harga coret opsional).
- D-05 Field produk disediakan lengkap tapi boleh kosong; foto diunggah developer/admin.
- D-06 SKU/nama yang tidak sesuai dirapikan saat import.
- D-07 Produk non-otomotif tetap dijual, dipisah lewat kategori.
- D-08 Pembayaran sementara Mayar + transfer manual lewat lapisan abstraksi.
- D-09 Invoice PDF untuk user, resi A5 cetak (termasuk massal) untuk admin.
- D-10 Notifikasi pakai toast (Sonner), bukan alert.
- D-11 Micro-interaction dan animasi di storefront; admin lebih kalem.
- D-12 Import awal lewat Jubelio API (script sekali jalan), fallback import CSV/Excel.
- D-13 Gambar di Cloudinary, email transaksional di Resend.
- D-14 Proyek dikerjakan per fase; tambahan di luar scope lewat change request.
- D-15 Fork GeekyTech = salin source tanpa history git (repo NZO mulai bersih), kode dipindah ke `src/`, 37 migration GeekyTech diarsip di `supabase/_reference/` sebagai acuan dan schema NZO ditulis ulang di Fase 1. Akun GitHub/Supabase/Vercel/Cloudinary/Resend dibuat user.
- D-16 Cloudinary memakai akun milik user yang sudah ada (bersama data lain). Semua aset NZO wajib di bawah root folder `nzo/`; folder dibangun di server lewat `src/lib/cloudinary/folders.ts`, public_id di luar `nzo/` ditolak. Repo: `github.com/rendiero25/NzoIndustries`.
- D-17 Project Supabase NZO di region `ap-southeast-2` (Sydney), keputusan user (bukan Singapore seperti rekomendasi awal P-03). Saat setup Vercel, region function disamakan (`syd1`) supaya latensi server ↔ DB minimal. Resend dipakai tanpa domain sampai P-09 terjawab.
- D-18 Varian produk boleh punya `price` (dan `compare_at_price`) opsional yang menggantikan harga produk; kosong = ikut harga produk. Melonggarkan D-04.
- D-19 Kode starter GeekyTech diisolasi: memakai `@/lib/supabase/legacy/*` dan `@/types/legacy-supabase` sampai ditulis ulang (Fase 3–8); kode NZO wajib memakai `@/lib/supabase/{server,client,admin}` dan `@/types/database` (dijaga ESLint). Migration diterapkan langsung ke project dev remote lewat Supabase CLI (tanpa Docker). Aksi admin dari UI memakai client user-scoped (RLS + `auth.uid()` untuk audit); service role hanya untuk webhook, cron, script, dan operasi sistem.
- D-20 Login staf tanpa scan QR/TOTP (keputusan user 2026-10-02, sudah diberi peringatan risiko). MFA tidak dihapus: flag `store_settings.require_staff_mfa` (default false, hanya owner yang bisa ubah) dibaca `private.has_role` di RLS dan `getStaffMfaRequired()` di aplikasi. Gagal membaca flag = MFA dianggap wajib. Akun yang sudah punya faktor TOTP tetap diminta kode saat ganti password (aturan Supabase Auth).
- D-21 Vercel project `nzo-industries.vercel.app` hanya untuk branch `development` (staging). Branch `main` nanti di domain utama (P-09). Supabase Auth: Site URL/Redirect URLs wajib memuat `https://nzo-industries.vercel.app/**`.
- D-22 P-01 terjawab: harga web = **Harga Default** dari Jubelio. Harga marketplace tidak dipakai; harga coret diatur admin.
- D-23 SKU web dinormalisasi agar cocok `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` (spasi, `/`, `+` jadi `-`; simbol dibuang; tabrakan diberi akhiran `-2`). SKU asli disimpan di `products.source_sku` / `product_variants.source_sku` untuk sinkron Jubelio/marketplace. Produk bervarian memakai SKU induk = prefix bersama SKU varian.
- D-24 Import awal dari export "Daftar Harga" Jubelio (XLS) lewat script, semua `draft`, stok 0 (export tanpa stok/foto/berat; menyusul via export lain atau API P-04). Nama tampil dirapikan otomatis (sinonim, alias model, "ORI/ASLI", nomor part dipindah ke spesifikasi); judul asli di `products.search_keywords` (ikut full-text search, tidak tampil). Kategori dan brand disarankan otomatis dari nama; saran fitment hanya disimpan di staging (dikonfirmasi admin di Fase 8). `products.import_locked` mencegah import ulang menimpa nama/harga hasil edit admin.
- D-26 DB dev: semua produk import dipublish agar storefront diuji dengan data nyata (tampil "Foto segera"/"Stok habis"). Produksi: admin publish manual setelah foto/stok/berat lengkap. Produk `DEMO-*` tetap published di dev (fixture `test:rls`).
- D-27 Fitment dua tingkat: `product_fitments.is_verified = true` (dikonfirmasi admin) = badge perisai "Cocok"; `false` (saran dari nama produk saat import, `source = 'import'`) = label teks "Disebut untuk {kendaraan}" tanpa perisai. Keduanya dipakai filter kendaraan, verified diurutkan dulu. Badge perisai **hanya** untuk verified.
- D-25 Logo resmi dari klien (`public/logo.png`) di-trace ke SVG (`public/brand/nzo-lockup.svg`, `nzo-mark.svg`); dirender sebagai CSS mask supaya mengikuti warna tema. Favicon = perisai.

## Pending info klien
Status: ⏳ menunggu, ✅ sudah dijawab (pindahkan hasilnya ke Decision log).
- P-01 ✅ Harga Default Jubelio (D-22).
- P-02 ⏳ Pembayaran final: Mayar, transfer langsung ke rekening klien, atau keduanya. Juga data rekening untuk transfer manual.
- P-03 ⏳ Hosting final (rekomendasi: Vercel Pro + Supabase Pro). Region Supabase sudah diputuskan: D-17. Vercel staging sudah ada (D-21); paket & production menunggu.
- P-04 ⏳ Akses Jubelio API: akun integrasi, paket yang mencakup API, dan izin tertulis menyalin katalog.
- P-05 ⏳ Toko Shopify: diganti web ini atau tetap berjalan.
- P-06 ⏳ Ada harga grosir/bengkel (reseller) atau tidak.
- P-07 ⏳ Status PKP (PPN dan format invoice).
- P-08 ⏳ Legal: pendaftaran PSE Komdigi, kebijakan privasi (UU PDP), syarat & ketentuan, kebijakan retur/garansi.
- P-09 ⏳ Domain web dan alamat email pengirim (untuk verifikasi Resend).
- P-10 ⏳ Notifikasi WhatsApp perlu atau tidak (opsional).
- P-11 ⏳ Data pengirim untuk resi: nama toko, alamat gudang, nomor telepon.
- P-12 ⏳ Kurir yang diaktifkan di Biteship dan apakah ada COD.

## Workflow Claude Code
- Gunakan Plan Mode sebelum memulai fase baru di `task.md`. Tunjukkan rencana, tunggu persetujuan.
- Kerjakan satu fase dalam satu waktu; centang task yang selesai dan catat hal penting di bagian Catatan fase.
- Skill stack UI (sama seperti GeekyTech): UI/UX Pro Max → Impeccable → Emil Design Eng → Vercel React BP. Aturan visual tetap mengikuti design-system.md.
- Sebelum menandai fase selesai: `lint`, `typecheck`, `build`, dan cek RLS untuk tabel baru.

## Changelog
- 0.1 (2026-09-30): Dokumen awal dari sesi perencanaan.
- 0.2 (2026-09-30): Fase 0. Tambah D-15, perintah aktual (pnpm 11, test, format, env, CSP).
- 0.3 (2026-10-01): Tambah D-16 (Cloudinary akun bersama, root folder `nzo/`, repo GitHub). Security rule 9 diperjelas.
- 0.4 (2026-10-01): Tambah D-17 (Supabase `ap-southeast-2`, Vercel `syd1`, Resend tanpa domain sampai P-09). P-03 diperbarui.
- 0.5 (2026-10-01): Fase 1. Tambah D-18 (harga varian opsional), D-19 (isolasi legacy, workflow migration remote, client user-scoped untuk aksi admin). Perintah database, test RLS, promote-owner. Aturan bisnis harga diperbarui.
- 0.6 (2026-10-02): Tambah D-20 (MFA staf lewat flag, default mati). Security rule 7 diperbarui.
- 0.7 (2026-10-02): Fase 2 (design system + redesign shell). Sinkron versi, tanpa keputusan baru.
- 0.9 (2026-10-07): Fase 4 (storefront di schema NZO). Tambah D-26 (publish dev), D-27 (fitment dua tingkat). Catatan rute storefront & DAL.
- 0.8 (2026-10-06): Fase 3. Tambah D-21 (Vercel staging), D-22 (P-01 terjawab), D-23 (normalisasi SKU), D-24 (import export Jubelio), D-25 (logo resmi). Perintah import.
