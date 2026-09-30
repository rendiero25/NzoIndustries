-- 025_variant_image.sql
-- Add per-variant representative image (FK to product_images).
-- Required for new/edited variants going forward; existing rows are backfilled
-- below so the public product page never has to handle a NULL image_id.

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS image_id uuid REFERENCES product_images(id) ON DELETE SET NULL;

-- Backfill: point every existing variant at its product's primary image.
UPDATE product_variants pv
SET image_id = pi.id
FROM product_images pi
WHERE pv.image_id IS NULL
  AND pi.product_id = pv.product_id
  AND pi.is_primary = true;
