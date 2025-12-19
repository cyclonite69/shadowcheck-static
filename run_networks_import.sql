-- ===============================
-- NETWORKS CONTROLLED IMPORT
-- ===============================
-- Preconditions:
-- - networks is EMPTY
-- - staging_networks is EMPTY
-- - CSVs are verified (15 cols)
-- ===============================

BEGIN;

-- Safety checks
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM networks) <> 0 THEN
    RAISE EXCEPTION 'ABORT: networks table is not empty';
  END IF;

  IF (SELECT COUNT(*) FROM staging_networks) <> 0 THEN
    RAISE EXCEPTION 'ABORT: staging_networks is not empty';
  END IF;
END$$;

-- ===============================
-- LOAD STAGING
-- ===============================
\copy staging_networks (
  device_id,
  bssid,
  ssid,
  frequency,
  capabilities,
  lasttime,
  lastlat,
  lastlon,
  type,
  bestlevel,
  bestlat,
  bestlon,
  rcois,
  mfgrid,
  service
) FROM 'j24_networks.csv' CSV;

\copy staging_networks (
  device_id,
  bssid,
  ssid,
  frequency,
  capabilities,
  lasttime,
  lastlat,
  lastlon,
  type,
  bestlevel,
  bestlat,
  bestlon,
  rcois,
  mfgrid,
  service
) FROM 'g63_networks.csv' CSV;

\copy staging_networks (
  device_id,
  bssid,
  ssid,
  frequency,
  capabilities,
  lasttime,
  lastlat,
  lastlon,
  type,
  bestlevel,
  bestlat,
  bestlon,
  rcois,
  mfgrid,
  service
) FROM 's22_networks.csv' CSV;

\copy staging_networks (
  device_id,
  bssid,
  ssid,
  frequency,
  capabilities,
  lasttime,
  lastlat,
  lastlon,
  type,
  bestlevel,
  bestlat,
  bestlon,
  rcois,
  mfgrid,
  service
) FROM 'backup_networks.csv' CSV;

-- ===============================
-- PROMOTE TO NETWORKS
-- ===============================
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
  bssid,
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
FROM staging_networks
ON CONFLICT (bssid) DO UPDATE
SET
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

-- ===============================
-- POST-IMPORT VERIFICATION
-- ===============================
-- These must all pass

-- 1. Staging loaded
SELECT COUNT(*) AS staging_rows FROM staging_networks;

-- 2. Networks populated
SELECT COUNT(*) AS network_rows FROM networks;

-- 3. No null authoritative fields
SELECT COUNT(*) AS null_type
FROM networks
WHERE type IS NULL;

-- 4. Entity uniqueness guaranteed
SELECT COUNT(*) AS dupes
FROM (
  SELECT bssid FROM networks GROUP BY bssid HAVING COUNT(*) > 1
) d;

COMMIT;

