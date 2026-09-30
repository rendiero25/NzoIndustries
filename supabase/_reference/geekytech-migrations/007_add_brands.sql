-- ============================================================
-- 007_add_brands.sql
-- GeekyTech — Tabel Brands + brand_id di Products
-- ============================================================

-- ============================================================
-- 1. Tabel brands
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  logo_url    text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Trigger updated_at untuk brands
-- ============================================================
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Tambah kolom brand_id ke tabel products
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Index performa
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_brands_slug       ON brands (slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active  ON brands (is_active);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);

-- ============================================================
-- 5. Row Level Security
-- ============================================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Publik bisa baca brand yang aktif; admin bisa baca semua
CREATE POLICY "brands_select_public" ON brands FOR SELECT
  USING (is_active = true OR is_admin());

-- Hanya admin yang bisa insert/update/delete
CREATE POLICY "brands_write_admin" ON brands FOR ALL
  USING (is_admin());
