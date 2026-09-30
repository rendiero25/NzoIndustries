-- Deskripsi merek untuk halaman daftar produk per brand (toko publik).
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS description text;
