-- ============================================================
-- 005_seed.sql
-- GeekyTech — Seed Data: settings, categories, FAQs
-- ============================================================

-- ============================================================
-- Settings
-- ============================================================
INSERT INTO settings (key, value) VALUES
('store_origin', '{"name":"GeekyTech","phone":"081234567890","province":"DKI Jakarta","city":"Jakarta Selatan","district":"Kebayoran Baru","postal_code":"12160","address":"Jl. Contoh No. 1"}'::jsonb),
('free_shipping_threshold', '200000'::jsonb),
('maintenance_mode', 'false'::jsonb),
('whatsapp_cs', '"6281234567890"'::jsonb),
('auto_complete_days', '7'::jsonb),
('payment_timeout_hours', '3'::jsonb),
('announcement_bar', '{"text":"Selamat datang di GeekyTech! Toko tech & gadget terpercaya.","is_active":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Categories (8 kategori)
-- ============================================================
INSERT INTO categories (name, slug, sort_order) VALUES
('Smartphone',  'smartphone',   1),
('Laptop',      'laptop',       2),
('Tablet',      'tablet',       3),
('Audio',       'audio',        4),
('Aksesori',    'aksesori',     5),
('Smartwatch',  'smartwatch',   6),
('Gaming',      'gaming',       7),
('Kamera',      'kamera',       8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FAQs (minimal 5)
-- ============================================================
INSERT INTO faqs (question, answer, category, sort_order) VALUES
(
  'Berapa lama pengiriman ke seluruh Indonesia?',
  'Estimasi pengiriman tergantung kurir dan lokasi tujuan. Untuk Jabodetabek biasanya 1-2 hari kerja, luar Jawa 3-7 hari kerja. Kamu bisa cek estimasi saat checkout.',
  'pengiriman',
  1
),
(
  'Metode pembayaran apa saja yang tersedia?',
  'Kami menerima transfer bank (BCA, BNI, BRI, Mandiri), dompet digital (GoPay, OVO, Dana, ShopeePay), QRIS, kartu kredit/debit, dan pembayaran di minimarket (Alfamart, Indomaret).',
  'pembayaran',
  2
),
(
  'Apakah produk yang dijual bergaransi resmi?',
  'Ya, semua produk yang kami jual memiliki garansi resmi dari distributor atau brand. Garansi berlaku sesuai ketentuan masing-masing brand. Detail garansi tercantum di halaman produk.',
  'garansi',
  3
),
(
  'Bagaimana cara mengajukan pengembalian barang (retur)?',
  'Retur dapat diajukan dalam 7 hari setelah barang diterima dengan kondisi produk belum digunakan, kemasan masih lengkap, dan disertai foto bukti. Ajukan melalui menu Komplain di halaman order.',
  'retur',
  4
),
(
  'Apakah ada promo atau diskon untuk pembelian pertama?',
  'Ya! Daftar akun baru dan dapatkan voucher diskon untuk pembelian pertama. Pantau juga halaman Flash Sale kami untuk penawaran terbatas setiap harinya.',
  'promo',
  5
),
(
  'Apakah bisa request invoice untuk keperluan bisnis?',
  'Tentu! Invoice resmi tersedia di halaman detail order setelah pembayaran berhasil. Invoice dapat diunduh dalam format PDF.',
  'pembayaran',
  6
)
ON CONFLICT DO NOTHING;
