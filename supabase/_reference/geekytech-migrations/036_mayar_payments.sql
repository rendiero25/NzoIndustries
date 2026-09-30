-- Payment gateway migration: Midtrans -> Mayar (Headless API V2, Payment Request).
--
-- Additive only, so code still running against this database (e.g. an older
-- deployment) keeps working. `midtrans_order_id` stays as the unique order
-- reference (it holds orders.order_number for every row, old and new) and
-- `midtrans_transaction_id` is kept for historical Midtrans rows.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider             text NOT NULL DEFAULT 'midtrans',
  ADD COLUMN IF NOT EXISTS mayar_payment_id     text,
  ADD COLUMN IF NOT EXISTS mayar_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_url          text;

-- Existing rows were created by Midtrans; new rows default to Mayar.
ALTER TABLE payments ALTER COLUMN provider SET DEFAULT 'mayar';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_mayar_payment_id
  ON payments (mayar_payment_id)
  WHERE mayar_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_mayar_transaction_id
  ON payments (mayar_transaction_id)
  WHERE mayar_transaction_id IS NOT NULL;
