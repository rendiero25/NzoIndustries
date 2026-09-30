-- Add proof_images column to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS proof_images jsonb NOT NULL DEFAULT '[]';
