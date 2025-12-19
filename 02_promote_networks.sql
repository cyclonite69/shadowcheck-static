BEGIN;

WITH ranked AS (
  SELECT
    UPPER(bssid) AS bssid_upper,
    ssid,
    type,
    frequency,
    capabilities,
    service,
    rcois,
    mfgrid,
    lasttime,
    lastlat,
    lastlon,
    bestlevel,
    bestlat,
    bestlon,
    device_id,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(bssid)
      ORDER BY lasttime DESC
    ) AS rn
  FROM staging_networks
)
INSERT INTO networks (
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
  source_device
)
SELECT
  bssid_upper,
  ssid,
  type,
  frequency,
  capabilities,
  service,
  rcois,
  mfgrid,
  lasttime,
  lastlat,
  lastlon,
  bestlevel,
  bestlat,
  bestlon,
  device_id
FROM ranked
WHERE rn = 1
ON CONFLICT (bssid) DO UPDATE SET
  ssid          = EXCLUDED.ssid,
  type          = EXCLUDED.type,
  frequency     = EXCLUDED.frequency,
  capabilities  = EXCLUDED.capabilities,
  service       = EXCLUDED.service,
  rcois         = EXCLUDED.rcois,
  mfgrid        = EXCLUDED.mfgrid,
  lasttime_ms   = EXCLUDED.lasttime_ms,
  lastlat       = EXCLUDED.lastlat,
  lastlon       = EXCLUDED.lastlon,
  bestlevel     = EXCLUDED.bestlevel,
  bestlat       = EXCLUDED.bestlat,
  bestlon       = EXCLUDED.bestlon,
  source_device = EXCLUDED.source_device;

COMMIT;
