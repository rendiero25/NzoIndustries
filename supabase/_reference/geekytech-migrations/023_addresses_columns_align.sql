-- ============================================================
-- 023_addresses_columns_align.sql
-- Selaraskan file migrasi dengan kolom yang sudah ada di live DB
-- (dulu ditambah manual via dashboard, belum ada di migrasi mana pun).
-- Catatan: lat/lng juga di-cover oleh 022_address_coordinates.sql (IF NOT EXISTS
-- → overlap aman/idempotent); file ini juga menambahkan kolom kelurahan.
--
--   kelurahan : sub-kecamatan (granularitas alamat ID)
--   lat / lng : koordinat alamat — dipakai kurir on-demand/instant
--               (GoSend/Gojek, GrabExpress) sebagai sumber koordinat
--               paling akurat (pin user), sebelum fallback geocode kode pos.
--
-- IF NOT EXISTS → no-op di DB yang sudah punya kolomnya; bikin kolom di
-- setup DB baru / preview branch.
-- ============================================================

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS kelurahan text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lat       double precision,
  ADD COLUMN IF NOT EXISTS lng       double precision;
