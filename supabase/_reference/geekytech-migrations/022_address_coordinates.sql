-- 022: koordinat alamat untuk kurir on-demand (GoSend/Grab/Borzo/dll)
-- Semua nullable agar alamat & order lama tidak terpengaruh.
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_lat double precision,
  ADD COLUMN IF NOT EXISTS shipping_lng double precision;
