\echo 'Creating staging_locations_all_raw table for raw GPS data'

CREATE TABLE IF NOT EXISTS staging_locations_all_raw (
  location_id bigserial PRIMARY KEY,
  device_id text REFERENCES device_sources(code),  -- Nullable during load, set afterward
  source_pk text NOT NULL,  -- Original _id from SQLite
  bssid text NOT NULL,
  level integer NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  altitude double precision NOT NULL,
  accuracy double precision NOT NULL,
  location_at_ms bigint NOT NULL,
  external integer NOT NULL DEFAULT 0,
  mfgrid integer NOT NULL DEFAULT 0,
  source_db text,  -- For audit trail, set after load
  loaded_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient joining
CREATE INDEX IF NOT EXISTS idx_raw_locations_device_time
  ON staging_locations_all_raw(device_id, location_at_ms);

CREATE INDEX IF NOT EXISTS idx_raw_locations_bssid
  ON staging_locations_all_raw(bssid);

-- Unique constraint to prevent duplicate loads
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_locations_natural_key
  ON staging_locations_all_raw(device_id, source_pk, location_at_ms);

\echo 'Raw locations table created'
