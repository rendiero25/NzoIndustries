-- URL banner opsional di entri brand (dipakai admin / integrasi promosi).
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS banner_secondary_url text;
