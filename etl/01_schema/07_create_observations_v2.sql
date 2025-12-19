-- Create fresh observations_v2 table for full rebuilds from SQLite-derived data.

CREATE TABLE IF NOT EXISTS observations_v2 (
  id bigserial PRIMARY KEY,
  device_id text NOT NULL REFERENCES device_sources(code),
  bssid text NOT NULL,
  ssid text,
  radio_type text,
  radio_frequency integer,
  radio_capabilities text,
  radio_service text,
  radio_rcois text,
  radio_lasttime_ms bigint,
  level integer NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  altitude double precision NOT NULL,
  accuracy double precision NOT NULL,
  time timestamptz NOT NULL,
  observed_at_ms bigint NOT NULL,
  external boolean NOT NULL DEFAULT false,
  mfgrid integer NOT NULL,
  source_tag text NOT NULL,
  source_pk text NOT NULL,
  geom geometry(Point,4326) NOT NULL,
  time_ms bigint NOT NULL
);

ALTER TABLE IF EXISTS observations_v2
  ADD COLUMN IF NOT EXISTS radio_type text,
  ADD COLUMN IF NOT EXISTS radio_frequency integer,
  ADD COLUMN IF NOT EXISTS radio_capabilities text,
  ADD COLUMN IF NOT EXISTS radio_service text,
  ADD COLUMN IF NOT EXISTS radio_rcois text,
  ADD COLUMN IF NOT EXISTS radio_lasttime_ms bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'observations_v2_natural_uniq'
  ) THEN
    ALTER TABLE observations_v2
      ADD CONSTRAINT observations_v2_natural_uniq UNIQUE
        (device_id, source_pk, bssid, level, lat, lon, altitude, accuracy, observed_at_ms, external, mfgrid);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_observations_v2_bssid ON observations_v2 (bssid);
CREATE INDEX IF NOT EXISTS idx_observations_v2_device_id ON observations_v2 (device_id);
CREATE INDEX IF NOT EXISTS idx_observations_v2_observed_at_ms ON observations_v2 (observed_at_ms);
CREATE INDEX IF NOT EXISTS idx_observations_v2_geom ON observations_v2 USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_observations_v2_radio_type ON observations_v2 (radio_type);
CREATE INDEX IF NOT EXISTS idx_observations_v2_radio_frequency ON observations_v2 (radio_frequency);
