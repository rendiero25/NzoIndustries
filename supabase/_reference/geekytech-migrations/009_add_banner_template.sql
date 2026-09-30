-- 009_add_banner_template.sql
-- Add template column to banners table (discriminator for main_banner, featured_products, etc.)

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS template text;

-- Migrate existing banners (created before this column existed) to main_banner
UPDATE banners
  SET template = 'main_banner'
  WHERE template IS NULL;

-- Add index for fast filtering by template
CREATE INDEX IF NOT EXISTS idx_banners_template ON banners (template);
