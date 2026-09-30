-- Foto ulasan produk: pelanggan bisa melampirkan hingga 5 foto per ulasan.
--
-- Additive only (aman untuk production yang masih jalan dengan kode lama).
-- Upload dilakukan server-side via service role (app/api/review-upload), jadi
-- bucket tidak butuh policy INSERT untuk user; bucket public untuk dibaca.

ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

ALTER TABLE product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_images_max;
ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_images_max
  CHECK (cardinality(images) <= 5);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
