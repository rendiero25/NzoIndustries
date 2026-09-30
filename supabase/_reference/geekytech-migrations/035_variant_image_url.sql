-- 035_variant_image_url.sql
-- Foto varian sekarang berdiri sendiri: selalu upload baru, disimpan sebagai URL
-- di product_variants, TIDAK pernah jadi row product_images. Dengan begitu foto
-- varian tak pernah muncul di galeri/carousel foto produk.
--
-- product_variants.image_id ditinggalkan (deprecated): tidak dibaca & tidak
-- ditulis lagi oleh aplikasi. Row lama di-backfill ke image_url di bawah supaya
-- produk existing tetap tampil normal sampai admin mengeditnya.

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS image_url text;

UPDATE product_variants pv
SET image_url = pi.url
FROM product_images pi
WHERE pv.image_url IS NULL
  AND pv.image_id = pi.id;
