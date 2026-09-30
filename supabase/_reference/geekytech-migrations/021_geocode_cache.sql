-- ============================================================
-- 021_geocode_cache.sql
-- Cache hasil geocoding kode pos -> lat/lng untuk kurir on-demand
-- (GoSend/Gojek, GrabExpress, dll).
--
-- Tujuan: setiap kode pos digeocode MAKSIMAL sekali. Sumber koordinat
-- (Geoapify/LocationIQ, lalu Nominatim sbg last-resort) hanya disentuh saat
-- cache miss, jadi rate-limit/kuota provider hampir tidak pernah kena.
--
-- Diakses HANYA server-side via service role (createServiceClient), jadi RLS
-- diaktifkan tanpa policy apa pun -> anon/authenticated tidak punya akses,
-- service_role bypass RLS sepenuhnya.
-- ============================================================

CREATE TABLE IF NOT EXISTS geocode_cache (
  postal_code text PRIMARY KEY,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  source      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE geocode_cache IS 'Cache kode pos -> koordinat untuk kurir on-demand. Server-only (service role).';
