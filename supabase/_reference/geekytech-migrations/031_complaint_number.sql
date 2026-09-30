-- Human-readable complaint id (e.g. KM-20260722-A1B2C3), mirroring the
-- order_number pattern (generate_order_number() in 002_functions_triggers.sql).

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_number text DEFAULT '';

CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.complaint_number = 'KM-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_complaint_number ON complaints;
CREATE TRIGGER set_complaint_number
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION generate_complaint_number();

-- Backfill existing rows so every complaint has a number, not just new ones.
UPDATE complaints
SET complaint_number = 'KM-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(id::text, 1, 6))
WHERE complaint_number IS NULL;

ALTER TABLE complaints ALTER COLUMN complaint_number SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE complaints ADD CONSTRAINT complaints_complaint_number_key UNIQUE (complaint_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
