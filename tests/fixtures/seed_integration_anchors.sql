-- tests/fixtures/seed_integration_anchors.sql
--
-- Idempotent seed for integration test anchor observations.
-- Run this after every shadowcheck_test refresh before running the suite:
--
--   psql -U shadowcheck_user -d shadowcheck_test -f tests/fixtures/seed_integration_anchors.sql
--
-- All rows use the locally-administered BSSID prefix 02:SC:TE:ST:
-- (02 = locally administered, SC:TE:ST = ShadowCheck TESt).
-- These are clearly synthetic and safe to truncate/reseed at any time.
--
-- device_id must reference app.device_sources.code — uses 'j24' (always present).
-- Each BSSID must exist in app.networks before observations can be inserted
-- (trigger mark_network_for_rescoring enforces FK via threat_scores_cache).

-- Anchor location: lon=-83.697, lat=43.023 (Flint, MI cluster)
-- All integration tests use a 200m radius centered here.

-- 1. Seed networks for anchor BSSIDs
INSERT INTO app.networks (bssid, type, frequency, capabilities, lasttime_ms, lastlat, lastlon)
VALUES
  ('02:SC:TE:ST:00:04', 'E', 2412, '[ESS]', 1717243200000, 43.0234, -83.6970),
  ('02:SC:TE:ST:00:03', 'W', 2412, '[ESS]', 1717243200000, 43.0234, -83.6970),
  ('02:SC:TE:ST:00:01', 'E', 2412, '[ESS]', 1717243200000, 43.0234, -83.6970),
  ('02:SC:TE:ST:00:00', 'W', 2412, '[ESS]', 1717243200000, 43.0234, -83.6970)
ON CONFLICT (bssid) DO NOTHING;

-- 2. Seed anchor observations (one per score path)
-- Unique key: (device_id, source_pk, bssid, level, lat, lon, altitude,
--              accuracy, observed_at_ms, external, mfgrid)
INSERT INTO app.observations (
  device_id, bssid, ssid, radio_type, radio_service,
  level, lat, lon, altitude, accuracy,
  time, observed_at_ms, time_ms,
  external, mfgrid, source_tag, source_pk,
  geom
)
VALUES
  -- score 4: Flock BLE UUID in radio_service
  (
    'j24', '02:SC:TE:ST:00:04', NULL, 'E',
    '3e1d50cd-7e3e-427d-8e1c-b78aa87fe624',
    -70, 43.0234, -83.6970, 0, 5,
    '2024-06-01 12:00:00+00', 1717243200000, 1717243200000,
    false, 0, 'test', 'anchor-score4',
    ST_SetSRID(ST_MakePoint(-83.6970, 43.0234), 4326)
  ),
  -- score 3: 10-digit SSID
  (
    'j24', '02:SC:TE:ST:00:03', '1234567890', 'W', NULL,
    -65, 43.0234, -83.6970, 0, 5,
    '2024-06-01 12:00:00+00', 1717243200000, 1717243200000,
    false, 0, 'test', 'anchor-score3',
    ST_SetSRID(ST_MakePoint(-83.6970, 43.0234), 4326)
  ),
  -- score 1: BLE ssid='4'
  (
    'j24', '02:SC:TE:ST:00:01', '4', 'E', NULL,
    -80, 43.0234, -83.6970, 0, 5,
    '2024-06-01 12:00:00+00', 1717243200000, 1717243200000,
    false, 0, 'test', 'anchor-score1',
    ST_SetSRID(ST_MakePoint(-83.6970, 43.0234), 4326)
  ),
  -- score 0: plain WiFi, no signature
  (
    'j24', '02:SC:TE:ST:00:00', 'TestNetwork', 'W', NULL,
    -60, 43.0234, -83.6970, 0, 5,
    '2024-06-01 12:00:00+00', 1717243200000, 1717243200000,
    false, 0, 'test', 'anchor-score0',
    ST_SetSRID(ST_MakePoint(-83.6970, 43.0234), 4326)
  )
ON CONFLICT (device_id, source_pk, bssid, level, lat, lon, altitude, accuracy, observed_at_ms, external, mfgrid)
DO NOTHING;
