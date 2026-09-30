-- 008_add_condition.sql
-- Add product condition column (new / second)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'new'
    CHECK (condition IN ('new', 'second'));
