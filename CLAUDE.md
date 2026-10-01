# CLAUDE.md — NZO Industries E-commerce

Versi dokumen: 0.3 (2026-10-01). Baca file ini di awal setiap sesi.

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
- `supabase db diff -f <nama>` untuk membuat migration, `supabase gen types typescript` setelah schema berubah.
- `pnpm tsx scripts/import-jubelio.ts --dry-run` untuk mencoba import tanpa menulis ke database.

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
7. Admin wajib MFA (Supabase Auth TOTP). RBAC dengan role: `owner`, `admin`, `warehouse`, `cs`, `customer`.
8. Setiap aksi admin tercatat di `audit_logs` (siapa, apa, kapan, before/after).
9. Upload Cloudinary hanya lewat signature dari server, dibatasi ke role admin, dengan folder dan tipe file yang ditentukan. Folder selalu di bawah `nzo/` (D-16); operasi hapus/rename hanya untuk public_id `nzo/...`.
10. Bukti transfer disimpan di bucket Supabase **privat**, divalidasi tipe (jpg/png/webp/pdf) dan ukuran (maks 5 MB), diakses via signed URL berumur pendek.
11. Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
12. Dependency Next.js/React/Supabase dipatch rutin. Jalankan `pnpm audit` sebelum rilis.
13. Jangan pernah log data sensitif (password, token, data pembayaran, alamat lengkap).
14. Kredensial Jubelio: akun integrasi khusus dari klien, disimpan di env server, tidak pernah di-commit.

## Aturan bisnis
- **Harga:** satu `price` + opsional `compare_at_price` untuk harga coret. Sumber harga menunggu P-01.
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

## Pending info klien
Status: ⏳ menunggu, ✅ sudah dijawab (pindahkan hasilnya ke Decision log).
- P-01 ⏳ Harga mana yang dipakai di web.
- P-02 ⏳ Pembayaran final: Mayar, transfer langsung ke rekening klien, atau keduanya. Juga data rekening untuk transfer manual.
- P-03 ⏳ Hosting final (rekomendasi: Vercel Pro + Supabase Pro region Singapore).
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
