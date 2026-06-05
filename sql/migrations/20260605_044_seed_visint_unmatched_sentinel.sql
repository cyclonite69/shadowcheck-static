BEGIN;

-- Seed VISINT unmatched fallback network so unmatched VISINT tags/media
-- comply with network_tags.bssid -> networks.bssid referential integrity.
INSERT INTO app.networks (
  bssid,
  ssid,
  type,
  frequency,
  capabilities,
  service,
  rcois,
  mfgrid,
  lasttime_ms,
  lastlat,
  lastlon,
  bestlevel,
  bestlat,
  bestlon,
  is_sentinel
)
VALUES (
  'VISINT_UNMATCHED',
  'VISINT Unmatched Fallback',
  'W',
  0,
  '',
  '',
  '',
  0,
  0,
  0.0,
  0.0,
  0,
  0.0,
  0.0,
  true
)
ON CONFLICT (bssid) DO UPDATE
SET
  ssid = EXCLUDED.ssid,
  is_sentinel = true;

COMMIT;
