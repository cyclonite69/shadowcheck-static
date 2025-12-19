\echo 'Apply locked fact table schema updates'

-- Ensure device_sources has locale for source metadata.
ALTER TABLE IF EXISTS device_sources
  ADD COLUMN IF NOT EXISTS locale text;

-- Create canonical networks table (one row per BSSID).
CREATE TABLE IF NOT EXISTS networks (
  bssid text PRIMARY KEY,
  ssid text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'W',
  frequency integer NOT NULL,
  capabilities text NOT NULL,
  service text NOT NULL DEFAULT '',
  rcois text NOT NULL DEFAULT '',
  mfgrid integer NOT NULL DEFAULT 0,
  lasttime_ms bigint NOT NULL,
  lastlat double precision NOT NULL,
  lastlon double precision NOT NULL,
  bestlevel integer NOT NULL DEFAULT 0,
  bestlat double precision NOT NULL DEFAULT 0,
  bestlon double precision NOT NULL DEFAULT 0,
  source_device text REFERENCES device_sources(code)
);

-- Create telemetry routes table.
CREATE TABLE IF NOT EXISTS routes (
  id bigserial PRIMARY KEY,
  device_id text NOT NULL REFERENCES device_sources(code),
  source_pk text NOT NULL,
  run_id integer NOT NULL,
  wifi_visible integer NOT NULL DEFAULT 0,
  cell_visible integer NOT NULL DEFAULT 0,
  bt_visible integer NOT NULL DEFAULT 0,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  altitude double precision NOT NULL,
  accuracy double precision NOT NULL,
  observed_at_ms bigint NOT NULL,
  geom geometry(Point,4326) NOT NULL,
  CONSTRAINT routes_natural_uniq UNIQUE
    (device_id, source_pk, run_id, wifi_visible, cell_visible, bt_visible, lat, lon, altitude, accuracy, observed_at_ms)
);
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST (geom);

-- Align observations table with locked schema by adding observed_at_ms and uniqueness.
ALTER TABLE IF EXISTS observations
  ADD COLUMN IF NOT EXISTS observed_at_ms bigint;

-- Backfill observed_at_ms from existing millisecond column when present.
UPDATE observations
SET observed_at_ms = COALESCE(observed_at_ms, time_ms)
WHERE observed_at_ms IS NULL;

-- Add uniqueness constraint for idempotent loads.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'observations_natural_uniq'
  ) THEN
    ALTER TABLE observations
      ADD CONSTRAINT observations_natural_uniq UNIQUE
        (device_id, source_pk, bssid, level, lat, lon, altitude, accuracy, observed_at_ms, external, mfgrid);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_observations_observed_at_ms ON observations (observed_at_ms);
