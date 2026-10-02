# design-system.md — NZO Industries

Versi dokumen: 0.7 (2026-10-02). Sinkron dengan `CLAUDE.md` (D-02, D-03, D-10, D-11, D-13) dan `task.md` (Fase 2 dan seterusnya).

## 1. Arah desain

**Subjek:** toko online produk otomotif motor dan mobil. Pengunjungnya pemilik kendaraan dan bengkel yang ingin tahu satu hal: *apakah part ini cocok untuk kendaraan saya?*

**Referensi dan apa yang diambil:**
- **mandjur.co.id (halaman produk):** layout detail produk dua kolom, galeri di kiri, info pembelian di kanan yang sticky, trust badges dekat tombol beli.
- **imow-indonesia.com (nuansa brand):** hero berkarakter kuat, statistik angka dengan counter, strip logo "dipercaya oleh", tombol WhatsApp mengambang, section gelap yang tegas.
- **sociolla.com (pola toko):** banner promo carousel, flash sale dengan countdown, chip kategori, rating dan ulasan yang menonjol, halaman per brand.

**Prinsip:**
1. **Kecocokan dulu, estetika kedua.** Pemilih kendaraan (fitment) adalah elemen paling khas dan muncul di hero, halaman kategori, dan detail produk.
2. **Tegas seperti logonya.** Hitam murni dan putih, garis bersih, sudut sedikit membulat. Satu warna aksen, dipakai hemat.
3. **Satu elemen ikonik:** bentuk perisai dari logo NZO dipakai sebagai motif untuk badge "Cocok untuk kendaraanmu". Tidak dipakai sebagai dekorasi di tempat lain.
4. **Storefront hidup, dashboard tenang.** Animasi dan Magic UI hanya di storefront. Dashboard fokus ke kecepatan kerja.

## 2. Warna

Dasar dari logo (hitam/putih) ditambah satu aksen **signal amber**, diambil dari lampu sein kendaraan: khas otomotif, kontras kuat dengan hitam.

| Token | Hex | Pemakaian |
|---|---|---|
| `brand-black` | `#000000` | Logo, teks utama, tombol primer, section gelap |
| `white` | `#FFFFFF` | Latar utama storefront |
| `asphalt` | `#1E1F22` | Latar footer dan section gelap sekunder, kartu di atas hitam |
| `steel-50` | `#F4F5F6` | Permukaan sekunder, latar kartu produk, input |
| `steel-200` | `#E3E5E8` | Border, divider |
| `steel-500` | `#6B7079` | Teks sekunder, placeholder (kontras ≥ 4.5:1 di putih) |
| `steel-700` | `#3A3D42` | Teks body di area padat, ikon |
| `signal` | `#FFB300` | Aksen: badge diskon, flash sale, indikator keranjang, highlight fitment |
| `signal-hover` | `#E6A100` | Hover elemen beraksen |
| `signal-soft` | `#FFF4D6` | Latar lembut untuk banner info promo |

**Aturan aksen:** `signal` hanya sebagai **fill** dengan teks hitam di atasnya, tidak pernah sebagai warna teks di latar putih (kontrasnya kurang). Maksimal satu elemen beraksen per viewport di luar badge produk.

**Warna semantik** (status saja, bukan dekorasi):
| Token | Hex | Pemakaian |
|---|---|---|
| `success` | `#1C7F46` | Pembayaran diterima, stok tersedia (digelapkan dari `#1F8A4C` agar teks putih ≥ 4.5:1) |
| `danger` | `#D92D20` | Error, stok habis, aksi destruktif |
| `info` | `#2563EB` | Status informasi di dashboard |
| `warning` | `#B54708` | Menunggu verifikasi, stok menipis |

**Pemetaan ke variabel shadcn** (`globals.css`, Tailwind v4 `@theme`):
- `--background`: white, `--foreground`: brand-black
- `--primary`: brand-black, `--primary-foreground`: white
- `--secondary`, `--muted`: steel-50; `--muted-foreground`: steel-500
- `--accent`: signal, `--accent-foreground`: brand-black
- `--border`, `--input`: steel-200; `--ring`: brand-black
- `--destructive`: danger
- Dashboard admin mendukung dark mode: `--background` asphalt, `--card` `#26282C`, `--foreground` white, `--border` `#3A3D42`. Storefront hanya light mode. Implementasi: kelas `dark` dipasang di `<html>` hanya selama berada di shell admin (toggle di header admin, disimpan di `localStorage`), dilepas saat keluar dari admin.

## 3. Tipografi

Satu keluarga: **Outfit** (Google Fonts, via `next/font/google`, `display: swap`), bobot 400, 500, 600, 700, 800. Geometris dan tegas, cocok dengan wordmark NZO.

| Token | Ukuran / line-height | Bobot | Pemakaian |
|---|---|---|---|
| `display` | 56/60 (mobile 36/40) | 800 | Headline hero |
| `h1` | 40/48 (mobile 30/36) | 700 | Judul halaman |
| `h2` | 30/36 (mobile 24/30) | 700 | Judul section |
| `h3` | 22/28 | 600 | Judul kartu besar, nama produk di PDP |
| `h4` | 18/26 | 600 | Sub-judul, judul panel |
| `body` | 16/26 | 400 | Teks utama |
| `body-sm` | 14/22 | 400 | Teks sekunder, tabel admin |
| `caption` | 12/16 | 500 | Metadata, label kecil |
| `price` | 20/28 (PDP 28/36) | 700 | Harga, selalu `tabular-nums` |

Aturan:
- Letter-spacing headline `-0.02em`, body normal.
- Sentence case di semua heading, tombol, dan label. Tidak memakai label ALL CAPS.
- Tidak mewarnai atau memiringkan satu kata di headline untuk aksen.
- Panjang baris teks maksimal ~72 karakter (`max-w-prose`).
- Harga coret: `body-sm`, `steel-500`, `line-through`, diletakkan setelah harga aktif.

## 4. Layout, spacing, radius, elevasi

- **Grid:** container maks 1280px, padding 16px (mobile) / 24px (tablet) / 32px (desktop). Grid 12 kolom desktop, 4 kolom mobile.
- **Spacing:** skala 4px (Tailwind default). Jarak antar section storefront 64px mobile, 96px desktop.
- **Alignment:** konten rata kiri. Rata tengah hanya untuk empty state dan halaman sukses.
- **Radius (berjenjang sesuai hierarki):**
  - `radius-sm` 4px: badge, chip status
  - `radius-md` 8px: tombol, input, select
  - `radius-lg` 12px: kartu produk, panel
  - `radius-xl` 16px: dialog, sheet, banner
  - `full`: avatar, chip kategori, tombol ikon bulat
- **Elevasi:** utamakan border `steel-200` daripada bayangan. Bayangan hanya untuk overlay (dropdown, dialog, sheet) dan hover kartu produk.

## 5. Struktur halaman storefront

### Header (semua halaman)
```
[ Bar promo tipis (signal-soft) — bisa ditutup, diatur dari admin ]
[ Logo ]  [ Search .................... ]  [ Garasi ] [ Wishlist ] [ Akun ] [ Keranjang(n) ]
[ Kategori ▾ ]  [ Motor ]  [ Mobil ]  [ Brand ]  [ Promo ]
```
Mobile: logo + ikon search + keranjang, menu lewat Sheet. Header menjadi sticky dan mengecil saat scroll.

### Beranda (urutan section)
```
1. Hero hitam: headline + pemilih kendaraan (merek → model → tahun) + tombol "Cari part"
2. Chip kategori (scroll horizontal)
3. Banner promo carousel (diatur dari admin)
4. Flash sale + countdown (muncul jika ada flash sale aktif)
5. Produk terlaris / terbaru (tab)
6. Belanja per brand (Marquee logo brand)
7. Statistik toko (NumberTicker: produk, pesanan terkirim, rating) + strip kepercayaan
8. Ulasan pelanggan
9. Panduan & artikel pemasangan (opsional)
10. Footer asphalt: info toko, layanan, kebijakan, pembayaran, kurir, sosial media
```
Tombol WhatsApp mengambang di kanan bawah (semua halaman storefront, kecuali checkout).

### Halaman kategori / pencarian (PLP)
```
[ Breadcrumb ]
[ Judul kategori + jumlah produk ]         [ Banner kecocokan: "Menampilkan part untuk Honda Vario 2022" ✕ ]
[ Filter (sidebar desktop / Sheet mobile) ] [ Urutkan ▾ ]
[ Kendaraan | Kategori | Brand | Harga | Rating | Stok ]  [ Grid produk 4/3/2 kolom ]
                                            [ Pagination / load more ]
```

### Kartu produk
Gambar 1:1 (latar steel-50) → badge (diskon `signal`, stok habis `danger`, badge perisai "Cocok" jika sesuai garasi) → nama (maks 2 baris) → rating + jumlah terjual → harga + harga coret → tombol ikon tambah ke keranjang (muncul saat hover di desktop, selalu tampil di mobile).

### Detail produk (PDP, pola mandjur)
```
[ Breadcrumb ]
[ Galeri: gambar utama + thumbnail, zoom ]   [ Brand · Nama produk (h3)          ]
[                                     ]   [ Rating, terjual, SKU               ]
[                                     ]   [ Harga + harga coret + % hemat       ]
[                                     ]   [ Varian (ToggleGroup)                ]
[                                     ]   [ Cek kecocokan kendaraan (perisai)   ]
[                                     ]   [ Qty + Tambah ke keranjang + Beli    ]
[                                     ]   [ Trust: garansi, original, kirim cepat ]
[ Tabs: Deskripsi | Spesifikasi | Kecocokan kendaraan | Cara pasang | Ulasan ]
[ Produk terkait ]
```
Mobile: bar beli sticky di bawah (harga + tombol).

### Keranjang dan checkout
- Keranjang: Sheet dari kanan untuk ringkasan cepat, halaman `/cart` untuk detail.
- Checkout satu halaman dengan langkah berurutan: alamat → kurir & ongkir → voucher → metode pembayaran → ringkasan. Ringkasan sticky di kanan (desktop).
- Halaman sukses: nomor pesanan, instruksi pembayaran (kode unik untuk transfer manual), tombol lihat pesanan.

## 6. Dashboard user dan admin

- **Layout:** shadcn Sidebar (collapsible) + header dengan breadcrumb dan menu akun. Konten maks 1440px.
- **Admin:** Data Table (TanStack) dengan filter, pencarian, kolom yang bisa diatur, bulk action, dan export. Form panjang dibagi Card per bagian. Ringkasan di beranda admin: kartu KPI + Chart (shadcn Charts).
- **User:** navigasi sidebar di desktop, tab/list menu di mobile. Status pesanan pakai Badge + timeline progres.
- Tanpa Magic UI dan tanpa animasi GSAP di dashboard. Hanya transisi dasar shadcn.

## 7. Komponen

**shadcn/ui (dipakai di semua area):** Button, Input, Textarea, Select, Combobox (Command + Popover), Checkbox, RadioGroup, Switch, ToggleGroup, Form, Label, Card, Badge, Avatar, Tabs, Accordion, Dialog, AlertDialog, Sheet, Drawer (mobile), DropdownMenu, NavigationMenu, Breadcrumb, Pagination, Table, Data Table, Carousel, Skeleton, Progress, Separator, ScrollArea, Tooltip, HoverCard, Calendar, DatePicker, Sidebar, Chart, Sonner, InputOTP (MFA), Slider (filter harga).

**Magic UI (storefront saja, daftar tertutup):**
- `Marquee`: logo brand di beranda.
- `NumberTicker`: statistik toko.
- `BlurFade`: hanya untuk urutan masuk hero.

Komponen Magic UI lain butuh persetujuan dan update dokumen ini. NumberTicker dan BlurFade membutuhkan paket `motion`; dipakai hanya lewat dua komponen itu (animasi lain tetap GSAP).

**Komponen NZO (Fase 2):**
- `src/components/catalog/`: `Price` (format id-ID, harga coret, "Hemat X%"), `FitmentBadge` + `ShieldMark` (perisai sementara sampai logo resmi tersedia), `ProductCard`, `ProductImage` (CldImage, placeholder "Foto segera" bila belum ada foto).
- `src/components/shared/`: `PageHeader`, `EmptyState`, skeleton set (`ProductCardSkeleton`, `ProductGridSkeleton`, `TableRowsSkeleton`, `DetailSkeleton`), `ConfirmDialog` (AlertDialog), `SiteLogo` (wordmark teks sementara, prop `tone` untuk latar gelap).
- Varian tombol: `primary`, `secondary`, `signal` (satu CTA promo per viewport), `ghost`, `destructive`, `destructive-ghost`, `link`.
- Pratinjau semua token & komponen: `/design` (hanya development).

**Ikon:** lucide-react, stroke 1.75, ukuran 16/20/24.

## 8. Motion dan micro-interaction

Token:
| Token | Durasi | Pemakaian |
|---|---|---|
| `instant` | 100ms | Tekan tombol, toggle |
| `fast` | 200ms | Hover, fokus, dropdown |
| `base` | 300ms | Sheet, dialog, tab |
| `slow` | 500ms | Hero, reveal besar |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` untuk masuk, `cubic-bezier(0.4, 0, 1, 1)` untuk keluar.

**Satu momen orkestrasi:** urutan masuk hero di beranda (headline → pemilih kendaraan → tombol) dengan GSAP timeline. Section lain tidak diberi animasi masuk berulang.

**Micro-interaction (merespons aksi user):**
- Tombol: `scale(0.97)` saat ditekan.
- Kartu produk: naik 2px + bayangan saat hover, gambar zoom ringan 1.03.
- Tambah ke keranjang: gambar produk "terbang" ke ikon keranjang (GSAP), badge jumlah memantul, lalu toast.
- Wishlist: ikon hati terisi dengan pop singkat.
- Pemilih kendaraan: dropdown berikutnya aktif dengan transisi, badge perisai "Cocok" muncul saat produk sesuai.
- Varian: perubahan harga dan stok memakai crossfade angka.
- Countdown flash sale: digit berganti dengan flip halus.
- Statistik: NumberTicker berjalan saat masuk viewport (sekali).
- Header: mengecil halus saat scroll.
- Skeleton saat loading, bukan spinner layar penuh.

**Aturan:**
- Wajib `prefers-reduced-motion`: semua animasi GSAP dan transform dimatikan, hanya perubahan opacity instan.
- Animasi hanya pada `transform` dan `opacity`.
- Dashboard: hanya transisi bawaan shadcn.

## 9. Feedback, notifikasi, dan state

- **Toast (Sonner)** untuk semua notifikasi hasil aksi. Posisi: bawah-tengah di mobile, kanan-bawah di desktop. Durasi 4 detik, error 6 detik. Varian: success, error, info, loading → success untuk proses async.
- **AlertDialog** hanya untuk konfirmasi aksi destruktif atau tidak bisa dibatalkan (hapus produk, batalkan pesanan, tolak bukti transfer).
- **Error form:** inline di bawah field (shadcn Form), bukan toast.
- **Empty state:** ilustrasi ikon sederhana + kalimat arahan + satu tombol aksi.
- **Loading:** Skeleton sesuai bentuk konten; tombol menampilkan spinner kecil dan disabled saat submit.

## 10. Copywriting

Bahasa Indonesia, sapaan "kamu", sentence case, kalimat aktif, tanpa basa-basi.
- Tombol menyebut aksinya: "Tambah ke keranjang", "Bayar sekarang", "Simpan perubahan".
- Nama aksi konsisten sampai toast: "Tambah ke keranjang" → "Ditambahkan ke keranjang"; "Hapus produk" → "Produk dihapus".
- Error menjelaskan apa yang salah dan cara memperbaikinya, tanpa minta maaf: "Stok tersisa 2. Kurangi jumlah pesanan."
- Istilah tetap: Garasi (kendaraan tersimpan), Cek kecocokan, Pesanan, Resi, Bukti transfer.

## 11. Gambar (Cloudinary)

- Semua gambar lewat `CldImage` dengan `f_auto`, `q_auto`, dan ukuran responsif.
- Rasio: produk 1:1, banner hero 21:9 (mobile 4:5), banner promo 16:9, logo brand bebas dengan tinggi seragam.
- Latar foto produk putih atau steel-50 agar grid seragam.
- Placeholder blur saat memuat. Alt text wajib (default: nama produk + varian).
- Folder: `nzo/products/{sku}`, `nzo/banners`, `nzo/brands`, `nzo/content`. Root `nzo/` wajib karena akun Cloudinary dipakai bersama data lain (D-16); helper `buildCloudinaryFolder()`.

## 12. Dokumen cetak

**Invoice (A4, PDF):** logo, nomor invoice, tanggal, status bayar, data pembeli dan alamat kirim, tabel item (nama, varian, SKU, qty, harga, subtotal), ongkir, diskon, total, metode pembayaran, info toko. Format pajak menunggu P-07.

**Resi (A5, 148 × 210 mm, PDF):**
```
[ Logo NZO ]                         [ Logo kurir + layanan ]
[ Barcode nomor resi (besar) ]
[ PENERIMA: nama, telp, alamat lengkap, kota, kode pos ]
[ PENGIRIM: data dari P-11 ]
[ No. pesanan | Berat | COD/Non-COD | Tanggal ]
[ Isi paket: daftar item + qty ]
```
Hitam-putih, tanpa warna aksen, aman untuk printer thermal/laser. Cetak massal: satu resi per halaman dalam satu PDF.

## 13. Aksesibilitas (standar minimum)

- Kontras teks ≥ 4.5:1, fokus keyboard terlihat (ring hitam 2px + offset).
- Target sentuh minimal 44 × 44px di mobile.
- Semua ikon tanpa teks memiliki `aria-label`.
- Form memiliki label yang terhubung, error diumumkan ke screen reader.

## Changelog
- 0.1 (2026-09-30): Dokumen awal.
- 0.2 (2026-09-30): Sinkron versi dengan Fase 0 (D-15). Catatan: kode starter masih memakai token/warna GeekyTech (`geeky-*`, oranye `#EA5329`, font Plus Jakarta Sans) dan logo placeholder `public/logo.svg`; diganti di Fase 2 sesuai dokumen ini.
- 0.3 (2026-10-01): §11 rujuk D-16 (root folder `nzo/` di akun Cloudinary bersama).
- 0.4 (2026-10-01): Sinkron versi (D-17, tanpa perubahan visual).
- 0.5 (2026-10-01): Sinkron versi (D-18, D-19). Komponen InputOTP ditambahkan untuk halaman MFA admin.
- 0.6 (2026-10-02): Sinkron versi (D-20).
- 0.7 (2026-10-02): Fase 2 diimplementasikan. `success` jadi `#1C7F46` (kontras AA), daftar komponen NZO + varian tombol `signal`, implementasi dark mode admin, catatan paket `motion` untuk Magic UI. Logo & perisai masih sementara.
